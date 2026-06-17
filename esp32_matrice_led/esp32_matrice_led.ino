#include <WiFi.h>
#include <time.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
#include <Adafruit_GFX.h>
#include <Wire.h>
#include <BH1750.h>
#include <DHT.h>

#define PIN_DHT11 13
#define DHTTYPE   DHT11
DHT dht(PIN_DHT11, DHTTYPE);

// ============================================================
//  CONFIGURATION
// ============================================================
const char* SSID_WIFI       = "test";
const char* PASSWORD_WIFI   = "12345678";
const char* SERVEUR_NTP     = "pool.ntp.org";
const long  DECALAGE_UTC    = 3600;
const int   HEURE_ETE       = 3600;
const char* OWM_API_KEY     = "bee196c0353b5153baa293b93a3745a3";
const char* VILLE           = "Paris,FR";
const char* NOM_UTILISATEUR = "Abdul";

#define PANEL_RES_X   64
#define PANEL_RES_Y   32
#define PANEL_CHAIN    1

#define INTERVALLE_METEO    600000UL
#define INTERVALLE_CAPTEUR    5000UL
#define DUREE_CAPTEUR         3000UL
#define INTERVALLE_LUX         300UL
#define INTERVALLE_DHT        2500UL

#define DUREE_PULSE 180UL   // durée du glow horloge en ms

// ============================================================
//  MODES
// ============================================================
enum ModeAffichage { MODE_NORMAL = 0, MODE_METEO_DETAIL, MODE_INFO_SYSTEME, NB_MODES };
ModeAffichage modeActuel = MODE_NORMAL;

// ============================================================
//  VARIABLES GLOBALES
// ============================================================
MatrixPanel_I2S_DMA* display = nullptr;
BH1750 capteurLumiere;

String texteDefilant = "";
int    positionX     = PANEL_RES_X;
const int vitesse    = 2;

uint16_t NOIR, ROUGE, VERT, BLEU, JAUNE, CYAN, BLANC, MAGENTA, ORANGE;

int  meteo_temp     = 0;
int  meteo_feels    = 0;
int  meteo_humidity = 0;
int  meteo_code     = 800;

unsigned long derniereMeteo           = 0;
unsigned long dernierAffichageCapteur = 0;
unsigned long derniereLectureLux      = 0;
unsigned long derniereLectureDHT      = 0;

bool          modeCapteur      = false;
unsigned long debutModeCapteur = 0;

float luxActuelle = 0.0f;
float luxLissee   = -1.0f;
float luxMin      = 99999.0f;
float luxMax      = 0.0f;

int temperatureDHT = 0;
int humiditeDHT    = 0;
bool dhtOK         = false;
String erreurDHT   = "";

bool systemePret  = false;
bool colonVisible = true;
int  derniereSec  = -1;

// ── Pulse horloge (glow à chaque seconde)
bool          pulseActif = false;
unsigned long debutPulse = 0;

// ── Balles animation WiFi
struct Balle { float x, y, vx, vy; uint16_t couleur; uint8_t rayon; };
#define NB_BALLES 4
Balle balles[NB_BALLES];

String msgWifi        = "";
int    largeurMsgWifi = 0;
int    animScrollPos  = PANEL_RES_X;
int    compteurAnim   = 0;
unsigned long dernierFrameAnim = 0;

// ── Pixels scintillants (écran normal)
struct Sparkle { int8_t x; int8_t y; uint8_t ttl; uint16_t col; };
#define MAX_SPARKLES 6
Sparkle sparkles[MAX_SPARKLES];

// ============================================================
//  UTILITAIRES
// ============================================================
const char* jourFrancais(int wday) {
  const char* j[] = {"Dim","Lun","Mar","Mer","Jeu","Ven","Sam"};
  return j[wday % 7];
}

uint16_t couleurTemperature(int temp) {
  if (temp <= 0)  return BLEU;
  if (temp <= 8)  return CYAN;
  if (temp <= 18) return VERT;
  if (temp <= 26) return JAUNE;
  if (temp <= 35) return ORANGE;
  return ROUGE;
}

bool estModeNuit() {
  struct tm t;
  if (!getLocalTime(&t)) return false;
  return (t.tm_hour >= 22 || t.tm_hour < 6);
}

const char* messagePersonnel() {
  struct tm t;
  if (!getLocalTime(&t)) return "";
  if (t.tm_hour >= 6  && t.tm_hour < 12) return "Bonjour les goat!";
  if (t.tm_hour >= 12 && t.tm_hour < 14) return "Bon appetit !";
  if (t.tm_hour >= 14 && t.tm_hour < 18) return "Bonne aprem !";
  if (t.tm_hour >= 18 && t.tm_hour < 22) return "Bonne soiree !";
  return "Bonne nuit...";
}

// ============================================================
//  AUTO-BRIGHTNESS — lux fort = panneau fort, lux faible = panneau sombre
// ============================================================
void ajusterBrillance(float lux) {
  if (luxLissee < 0.0f) {
    luxLissee = lux;
  } else {
    float diff  = fabsf(lux - luxLissee);
    float alpha = (diff > 200.0f) ? 0.60f : 0.10f;
    luxLissee   = luxLissee * (1.0f - alpha) + lux * alpha;
  }

  float logLux = logf(luxLissee + 1.0f);
  float logMax = logf(8001.0f);
  uint8_t b    = (uint8_t)(8.0f + (logLux / logMax) * 247.0f);
  b = constrain(b, 8, 255);

  display->setBrightness8(b);
  Serial.printf("Lux:%.1f  Lissee:%.1f  Bright:%d\n", lux, luxLissee, b);
}

// ============================================================
//  SPARKLES
// ============================================================
void mettreAJourSparkles() {
  for (int i = 0; i < MAX_SPARKLES; i++) {
    if (sparkles[i].ttl > 0) sparkles[i].ttl--;
  }
  if (random(0, 6) == 0) {
    for (int i = 0; i < MAX_SPARKLES; i++) {
      if (sparkles[i].ttl == 0) {
        sparkles[i].x   = (int8_t)random(33, 63);
        sparkles[i].y   = (int8_t)random(15, 31);
        sparkles[i].ttl = (uint8_t)random(3, 9);
        const uint16_t pal[] = {BLANC, CYAN, JAUNE, ORANGE};
        sparkles[i].col = pal[random(0, 4)];
        break;
      }
    }
  }
  for (int i = 0; i < MAX_SPARKLES; i++) {
    if (sparkles[i].ttl > 0)
      display->drawPixel(sparkles[i].x, sparkles[i].y, sparkles[i].col);
  }
}

// ============================================================
//  ANIMATION DÉMARRAGE
// ============================================================
void animationDemarrage() {
  for (int pass = 0; pass < 4; pass++) {
    display->fillScreen(0);
    for (int col = pass % 2; col < PANEL_RES_X; col += 2) {
      uint8_t g = (uint8_t)random(80, 220);
      display->drawFastVLine(col, 0, PANEL_RES_Y,
        display->color565(0, g, (uint8_t)(g / 4)));
    }
    delay(30);
  }
  display->fillScreen(0);

  for (int x = 0; x < PANEL_RES_X + 10; x++) {
    display->fillScreen(0);
    for (int t = 0; t <= 9 && (x - t) >= 0 && (x - t) < PANEL_RES_X; t++) {
      uint8_t v = (uint8_t)(220 - t * 22);
      display->drawFastVLine(x - t, 0, PANEL_RES_Y,
        display->color565((uint8_t)(v / 5), (uint8_t)(v / 4), v));
    }
    delay(4);
  }
  display->fillScreen(0);

  display->drawRect(0, 0, PANEL_RES_X, PANEL_RES_Y, display->color565(0, 80, 140));

  const uint16_t arc[] = {ROUGE, ORANGE, JAUNE, VERT, CYAN, BLEU, MAGENTA};
  const char* msg1 = "Bonjour";
  int x1 = (PANEL_RES_X - (int)strlen(msg1) * 6) / 2;
  for (int i = 0; i < (int)strlen(msg1); i++) {
    for (int gl = 3; gl >= 1; gl--) {
      int px = x1 + i * 6 - gl * 2;
      if (px >= 0) {
        display->setTextColor(display->color565(0, 0, (uint8_t)(50 - gl * 15)));
        display->setCursor(px, 3);
        display->print(msg1[i]);
      }
    }
    display->setTextColor(arc[i % 7]);
    display->setCursor(x1 + i * 6, 3);
    display->print(msg1[i]);
    delay(80);
  }
  delay(200);

  display->drawFastHLine(8, 13, 48, display->color565(60, 40, 0));

  String msgNom = String(NOM_UTILISATEUR) + " !";
  int xNom = (PANEL_RES_X - (int)msgNom.length() * 6) / 2;
  for (int i = 0; i < (int)msgNom.length(); i++) {
    display->setTextColor(JAUNE);
    display->setCursor(xNom + i * 6, 18);
    display->print(msgNom[i]);
    for (int s = 0; s < 3; s++)
      display->drawPixel(random(2, 62), random(14, 30),
                         random(2) ? BLANC : CYAN);
    delay(100);
  }

  delay(300);
  for (int fl = 0; fl < 6; fl++) {
    display->setBrightness8(fl % 2 == 0 ? 230 : 40);
    delay(55);
  }
  display->setBrightness8(90);
  delay(200);

  for (int y = 0; y < PANEL_RES_Y; y++) {
    display->drawFastHLine(0, y, PANEL_RES_X, 0);
    delay(10);
  }
  display->fillScreen(0);
}

// ============================================================
//  ANIMATION CHANGEMENT DE MODE
// ============================================================
void animationChangementMode() {
  const char*    noms[] = {"NORMAL", "METEO+", "INFOS"};
  const uint16_t cols[] = {CYAN,      JAUNE,    MAGENTA};
  uint16_t c = cols[modeActuel];

  for (int x = 0; x < PANEL_RES_X + PANEL_RES_Y; x += 2) {
    for (int y = 0; y < PANEL_RES_Y; y++) {
      int px = x - y;
      if (px >= 0 && px < PANEL_RES_X)
        display->drawPixel(px, y, c);
      if (px - 1 >= 0 && px - 1 < PANEL_RES_X)
        display->drawPixel(px - 1, y,
          display->color565(
            (uint8_t)((c >> 11 & 0x1F) * 3),
            (uint8_t)((c >>  5 & 0x3F) * 1),
            (uint8_t)((c       & 0x1F) * 3)));
    }
    delay(3);
  }

  display->fillScreen(0);
  display->drawRect(0, 0, PANEL_RES_X, PANEL_RES_Y, c);

  int xc = (PANEL_RES_X - (int)strlen(noms[modeActuel]) * 6) / 2;
  display->setTextColor(c);
  display->setCursor(xc, 5);
  display->print(noms[modeActuel]);

  for (int m = 0; m < NB_MODES; m++) {
    if (m == (int)modeActuel)
      display->fillCircle(22 + m * 10, 22, 3, cols[m]);
    else
      display->drawCircle(22 + m * 10, 22, 2, display->color565(40, 40, 40));
  }

  delay(700);

  for (int x = 0; x < PANEL_RES_X; x += 2) {
    display->drawFastVLine(x,     0, PANEL_RES_Y, 0);
    if (x > 0) display->drawFastVLine(x - 1, 0, PANEL_RES_Y, 0);
    delay(2);
  }
  display->fillScreen(0);
  positionX = PANEL_RES_X;
}

// ============================================================
//  ANIMATION ATTENTE WIFI
// ============================================================
void animationAttenteWifi() {
  unsigned long now = millis();
  if (now - dernierFrameAnim < 30) return;
  dernierFrameAnim = now;
  compteurAnim++;

  display->fillScreen(0);

  float pulse = sinf(compteurAnim * 0.10f);
  uint8_t pb  = (uint8_t)((pulse + 1.0f) * 50.0f);
  display->drawRect(0, 0, 64, 32, display->color565(pb, 0, (uint8_t)(pb * 2)));
  display->drawRect(1, 1, 62, 30, display->color565((uint8_t)(pb / 3), 0, pb));

  for (int i = 0; i < NB_BALLES; i++) {
    int tx = (int)(balles[i].x - balles[i].vx * 2.5f);
    int ty = (int)(balles[i].y - balles[i].vy * 2.5f);
    display->fillCircle(tx, ty, balles[i].rayon,
      display->color565(
        (uint8_t)((balles[i].couleur >> 11 & 0x1F) * 2),
        (uint8_t)( balles[i].couleur >>  5 & 0x3F),
        (uint8_t)((balles[i].couleur       & 0x1F) * 2)));

    balles[i].x += balles[i].vx;
    balles[i].y += balles[i].vy;

    float xMin = 2.0f + balles[i].rayon, xMax = 61.0f - balles[i].rayon;
    float yMin = 2.0f + balles[i].rayon, yMax = 19.0f - balles[i].rayon;

    if (balles[i].x <= xMin || balles[i].x >= xMax) {
      balles[i].vx = -balles[i].vx;
      balles[i].x  = constrain(balles[i].x, xMin, xMax);
    }
    if (balles[i].y <= yMin || balles[i].y >= yMax) {
      balles[i].vy = -balles[i].vy;
      balles[i].y  = constrain(balles[i].y, yMin, yMax);
    }

    display->fillCircle((int)balles[i].x, (int)balles[i].y,
                        balles[i].rayon, balles[i].couleur);
  }

  uint16_t cTxt = (compteurAnim / 6) % 2 == 0 ? JAUNE : ORANGE;
  display->setTextColor(cTxt);
  display->setCursor(7, 6);
  display->print("NO WIFI!");

  const char* sp[] = {"|", "/", "-", "\\"};
  display->setTextColor(CYAN);
  display->setCursor(57, 1);
  display->print(sp[(compteurAnim / 3) % 4]);

  display->drawFastHLine(0, 21, 64, display->color565(50, 50, 50));

  const uint16_t pal7[] = {ROUGE, ORANGE, JAUNE, VERT, CYAN, BLEU, MAGENTA};
  for (int i = 0; i < (int)msgWifi.length(); i++) {
    int xL = animScrollPos + i * 6;
    if (xL > -6 && xL < 64) {
      display->setTextColor(pal7[(i + compteurAnim / 3) % 7]);
      display->setCursor(xL, 23);
      display->print(msgWifi[i]);
    }
  }
  animScrollPos -= 2;
  if (animScrollPos < -largeurMsgWifi) animScrollPos = PANEL_RES_X;
}

// ============================================================
//  MÉTÉO
// ============================================================
void recupererMeteo() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = "http://api.openweathermap.org/data/2.5/weather?q=";
  url += VILLE; url += "&appid="; url += OWM_API_KEY; url += "&units=metric";

  Serial.print("Meteo... ");
  HTTPClient http;
  http.begin(url);
  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    if (!deserializeJson(doc, payload)) {
      meteo_temp     = (int)doc["main"]["temp"].as<float>();
      meteo_feels    = (int)doc["main"]["feels_like"].as<float>();
      meteo_humidity = doc["main"]["humidity"].as<int>();
      meteo_code     = doc["weather"][0]["id"].as<int>();
      Serial.printf("OK %dC res:%dC hum:%d%%\n", meteo_temp, meteo_feels, meteo_humidity);
    } else { Serial.println("Erreur JSON"); }
  } else { Serial.printf("Erreur HTTP %d\n", code); }
  http.end();
}

String emojiMeteo() {
  struct tm now; bool nuit = false;
  if (getLocalTime(&now)) nuit = (now.tm_hour < 6 || now.tm_hour >= 21);
  if (meteo_code >= 200 && meteo_code < 300) return "Orage";
  if (meteo_code >= 300 && meteo_code < 400) return "Bruine";
  if (meteo_code >= 500 && meteo_code < 600) return "Pluie";
  if (meteo_code >= 600 && meteo_code < 700) return "Neige";
  if (meteo_code >= 700 && meteo_code < 800) return "Brume";
  if (meteo_code == 800) return nuit ? "Nuit" : "Soleil";
  return "Nuages";
}

uint16_t couleurMeteo() {
  if (meteo_code >= 200 && meteo_code < 300) return JAUNE;
  if (meteo_code >= 300 && meteo_code < 600) return BLEU;
  if (meteo_code >= 600 && meteo_code < 700) return BLANC;
  if (meteo_code >= 700 && meteo_code < 800) return CYAN;
  if (meteo_code == 800) return JAUNE;
  return BLANC;
}

// ============================================================
//  LECTURE DHT11
// ============================================================
void lireDHT11() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    dhtOK     = false;
    erreurDHT = "Erreur lecture";
    Serial.println("Erreur DHT11 : lecture impossible");
  } else {
    temperatureDHT = (int)t;
    humiditeDHT    = (int)h;
    dhtOK          = true;
    erreurDHT      = "";
    Serial.printf("DHT11 -> T:%dC  H:%d%%\n", temperatureDHT, humiditeDHT);
  }
}

// ============================================================
//  ÉCRAN CAPTEUR — accepte un décalage vertical (pour slide)
// ============================================================
void afficherEcranCapteur(int yOff = 0) {
  display->fillScreen(0);

  auto inScreen = [](int y) { return y >= 0 && y < PANEL_RES_Y; };

  if (inScreen(1 + yOff)) {
    display->setTextColor(CYAN);
    display->setCursor(2, 1 + yOff);
    display->print("CAPTEURS");
    display->setTextColor(dhtOK ? VERT : ROUGE);
    display->setCursor(dhtOK ? 46 : 40, 1 + yOff);
    display->print(dhtOK ? "OK" : "DHT!");
  }

  if (inScreen(10 + yOff))
    display->drawFastHLine(0, 10 + yOff, 64, display->color565(50, 50, 50));

  if (inScreen(12 + yOff)) {
    if (dhtOK) {
      char bufDHT[18];
      sprintf(bufDHT, "T:%dC H:%d%%", temperatureDHT, humiditeDHT);
      display->setTextColor(couleurTemperature(temperatureDHT));
      display->setCursor(2, 12 + yOff);
      display->print(bufDHT);
    } else {
      display->setTextColor(ROUGE);
      display->setCursor(2, 12 + yOff);
      display->print("DHT erreur");
    }
  }

  if (inScreen(21 + yOff))
    display->drawFastHLine(0, 21 + yOff, 64, display->color565(50, 50, 50));

  if (inScreen(23 + yOff)) {
    char bufLux[16];
    if      (luxActuelle < 1.0f)   sprintf(bufLux, "Lux:<1");
    else if (luxActuelle < 100.0f) sprintf(bufLux, "Lux:%.1f", luxActuelle);
    else                            sprintf(bufLux, "Lux:%.0f", luxActuelle);
    display->setTextColor(JAUNE);
    display->setCursor(2, 23 + yOff);
    display->print(bufLux);

    int barre = (int)(logf(fmaxf(luxLissee, 0.0f) + 1.0f) / logf(8001.0f) * 18.0f);
    barre = constrain(barre, 0, 18);
    if (inScreen(23 + yOff) && inScreen(29 + yOff)) {
      display->drawRect(44, 23 + yOff, 20, 7, display->color565(40, 40, 40));
      for (int px = 0; px < barre; px++) {
        uint8_t r = (uint8_t)(px * 14);
        uint8_t g = (uint8_t)((18 - px) * 14);
        display->drawFastVLine(45 + px, 24 + yOff, 5, display->color565(r, g, 0));
      }
    }
  }
}

// ============================================================
//  TRANSITIONS SLIDE — l'écran capteur glisse depuis le bas
// ============================================================
void transitionEntreeCapteur() {
  for (int off = PANEL_RES_Y; off > 0; off -= 4) {
    afficherEcranCapteur(off);
    delay(14);
  }
  afficherEcranCapteur(0);
}

void transitionSortieCapteur() {
  for (int off = 0; off <= PANEL_RES_Y; off += 4) {
    afficherEcranCapteur(off);
    delay(14);
  }
  display->fillScreen(0);
}

// ============================================================
//  ÉCRAN MÉTÉO DÉTAILLÉ
// ============================================================
void afficherEcranMeteoDetail() {
  display->fillScreen(0);

  display->setTextColor(couleurMeteo());
  display->setCursor(1, 1);
  display->print(emojiMeteo());

  char bufCode[8];
  sprintf(bufCode, "#%d", meteo_code);
  display->setTextColor(display->color565(70, 70, 70));
  display->setCursor(63 - (int)strlen(bufCode) * 6, 1);
  display->print(bufCode);

  display->drawFastHLine(0, 10, 64, display->color565(50, 50, 50));

  char bufTemp[8];
  sprintf(bufTemp, "T: %dC", meteo_temp);
  display->setTextColor(couleurTemperature(meteo_temp));
  display->setCursor(1, 12);
  display->print(bufTemp);

  display->drawFastHLine(0, 21, 64, display->color565(50, 50, 50));

  char bufRH[12];
  sprintf(bufRH, "R%dC H%d%%", meteo_feels, meteo_humidity);
  display->setTextColor(CYAN);
  display->setCursor(1, 23);
  display->print(bufRH);
}

// ============================================================
//  ÉCRAN INFOS SYSTÈME
// ============================================================
void afficherEcranInfoSysteme() {
  display->fillScreen(0);

  display->setTextColor(MAGENTA);
  display->setCursor(1, 1);
  display->print("INFOS");

  int rssi = WiFi.RSSI();
  int bars = rssi > -55 ? 4 : rssi > -65 ? 3 : rssi > -75 ? 2 : 1;
  for (int b = 0; b < 4; b++) {
    int bh = 2 + b * 2;
    uint16_t c = b < bars ? VERT : display->color565(35, 35, 35);
    display->fillRect(44 + b * 4, 9 - bh, 3, bh, c);
  }

  display->drawFastHLine(0, 10, 64, display->color565(50, 50, 50));

  IPAddress ip = WiFi.localIP();
  char bufIP[16];
  sprintf(bufIP, "IP .%d.%d", ip[2], ip[3]);
  display->setTextColor(CYAN);
  display->setCursor(1, 12);
  display->print(bufIP);

  display->drawFastHLine(0, 21, 64, display->color565(50, 50, 50));

  int h = (int)(millis() / 3600000UL);
  int m = (int)((millis() % 3600000UL) / 60000UL);
  char bufUp[12];
  sprintf(bufUp, "UP %dh%02dm", h, m);
  display->setTextColor(BLANC);
  display->setCursor(1, 23);
  display->print(bufUp);
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0));

  dht.begin();
  Serial.println("DHT11 initialise sur GPIO 13");

  HUB75_I2S_CFG mxconfig(PANEL_RES_X, PANEL_RES_Y, PANEL_CHAIN);
  mxconfig.gpio.r1  = 25; mxconfig.gpio.g1  = 26; mxconfig.gpio.b1  = 27;
  mxconfig.gpio.r2  = 32; mxconfig.gpio.g2  = 33; mxconfig.gpio.b2  = 14;
  mxconfig.gpio.a   =  4; mxconfig.gpio.b   = 16; mxconfig.gpio.c   = 17;
  mxconfig.gpio.d   = 18; mxconfig.gpio.e   = -1;
  mxconfig.gpio.lat = 19; mxconfig.gpio.oe  = 23; mxconfig.gpio.clk = 15;
  mxconfig.clkphase = false;
  mxconfig.driver   = HUB75_I2S_CFG::SHIFTREG;

  display = new MatrixPanel_I2S_DMA(mxconfig);
  display->begin();
  display->setBrightness8(90);
  display->clearScreen();
  display->setTextSize(1);
  display->setTextWrap(false);

  NOIR    = display->color565(  0,   0,   0);
  ROUGE   = display->color565(255,   0,   0);
  VERT    = display->color565(  0, 255,   0);
  BLEU    = display->color565(  0,   0, 255);
  JAUNE   = display->color565(255, 255,   0);
  CYAN    = display->color565(  0, 255, 255);
  BLANC   = display->color565(255, 255, 255);
  MAGENTA = display->color565(255,   0, 255);
  ORANGE  = display->color565(255, 140,   0);

  Wire.begin(21, 22);
  capteurLumiere.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)
    ? Serial.println("BH1750 OK") : Serial.println("BH1750 non detecte");

  memset(sparkles, 0, sizeof(sparkles));

  animationDemarrage();

  balles[0] = { 8.0f,  8.0f,  1.4f,  0.9f, ROUGE,   2};
  balles[1] = {40.0f,  5.0f, -1.1f,  1.3f, VERT,    2};
  balles[2] = {25.0f, 14.0f,  0.8f, -1.1f, MAGENTA, 1};
  balles[3] = {52.0f, 10.0f, -0.9f,  1.1f, CYAN,    1};

  msgWifi        = "  Connexion...  SSID: " + String(SSID_WIFI) + "   ";
  largeurMsgWifi = msgWifi.length() * 6;

  WiFi.begin(SSID_WIFI, PASSWORD_WIFI);
  positionX = PANEL_RES_X;
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  // ── CAS 1 — WiFi non connecté ─────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    systemePret = false;
    animationAttenteWifi();
    return;
  }

  // ── CAS 2 — Première connexion ────────────────────────────────
  if (!systemePret) {
    display->fillScreen(0);
    display->setTextColor(VERT);  display->setCursor(4,  8); display->print("WiFi OK !");
    display->setTextColor(CYAN);  display->setCursor(2, 19); display->print("Synchro...");

    configTime(DECALAGE_UTC, HEURE_ETE, SERVEUR_NTP);
    struct tm t; int essais = 0;
    while (!getLocalTime(&t) && essais++ < 10) delay(500);

    recupererMeteo();
    lireDHT11();
    derniereMeteo = dernierAffichageCapteur = derniereLectureLux = derniereLectureDHT = millis();
    systemePret = true;

    display->fillScreen(0);
    positionX = animScrollPos = PANEL_RES_X;
    return;
  }

  // ── CAS 3 — Système opérationnel ─────────────────────────────
  unsigned long nowMs = millis();

  if (nowMs - derniereMeteo >= INTERVALLE_METEO) {
    derniereMeteo = nowMs;
    recupererMeteo();
  }

  if (nowMs - derniereLectureLux >= INTERVALLE_LUX) {
    derniereLectureLux = nowMs;
    float l = capteurLumiere.readLightLevel();
    if (l >= 0.0f) {
      luxActuelle = l;
      if (luxActuelle < luxMin) luxMin = luxActuelle;
      if (luxActuelle > luxMax) luxMax = luxActuelle;
      ajusterBrillance(luxActuelle);
    }
  }

  if (nowMs - derniereLectureDHT >= INTERVALLE_DHT) {
    derniereLectureDHT = nowMs;
    lireDHT11();
  }

  // ── Modes secondaires ─────────────────────────────────────────
  if (modeActuel == MODE_METEO_DETAIL) {
    afficherEcranMeteoDetail();
    delay(100);
    return;
  }
  if (modeActuel == MODE_INFO_SYSTEME) {
    afficherEcranInfoSysteme();
    delay(200);
    return;
  }

  // ── Écran capteur auto avec transitions slide ─────────────────
  if (!modeCapteur && (nowMs - dernierAffichageCapteur >= INTERVALLE_CAPTEUR)) {
    modeCapteur      = true;
    debutModeCapteur = nowMs;
    transitionEntreeCapteur();   // glisse depuis le bas
  }
  if (modeCapteur) {
    if (nowMs - debutModeCapteur >= DUREE_CAPTEUR) {
      transitionSortieCapteur();  // glisse vers le bas
      modeCapteur             = false;
      dernierAffichageCapteur = millis();
    } else {
      afficherEcranCapteur(0);
      delay(80);
      return;
    }
  }

  // ── Affichage normal ──────────────────────────────────────────
  char tamponDate[8] = "--/--";
  char bufJour[4]    = "---";
  char bufH[3]       = "--";
  char bufM[3]       = "--";

  struct tm infosTemps;
  bool heureValide = getLocalTime(&infosTemps);
  if (heureValide) {
    strftime(tamponDate, sizeof(tamponDate), "%d/%m", &infosTemps);
    strncpy(bufJour, jourFrancais(infosTemps.tm_wday), sizeof(bufJour) - 1);
    sprintf(bufH, "%02d", infosTemps.tm_hour);
    sprintf(bufM, "%02d", infosTemps.tm_min);
    if (infosTemps.tm_sec != derniereSec) {
      derniereSec  = infosTemps.tm_sec;
      colonVisible = !colonVisible;
      // Déclenche le glow à chaque changement de seconde
      pulseActif = true;
      debutPulse = millis();
    }
  }

  char bufLuxScroll[10];
  if (luxActuelle < 1.0f) sprintf(bufLuxScroll, "<1lx");
  else                     sprintf(bufLuxScroll, "%.0flx", luxActuelle);

  char bufDHTScroll[20];
  if (dhtOK) sprintf(bufDHTScroll, "In:%dC %d%%", temperatureDHT, humiditeDHT);
  else       sprintf(bufDHTScroll, "DHT:ERR");

  texteDefilant = String("  ") + String(messagePersonnel()) +
                  String("   ") + String(bufJour) + String(" ") + String(tamponDate) +
                  String("   ") + emojiMeteo() + String(" ") + String(meteo_temp) + String("C") +
                  String("   ") + String(bufDHTScroll) +
                  String("   ") + String(bufLuxScroll) + String("   ");

  int largeurTexte = texteDefilant.length() * 6;

  display->fillScreen(0);

  // Texte défilant arc-en-ciel — tShift borné pour éviter overflow après 48h
  const uint16_t arc7[] = {ROUGE, ORANGE, JAUNE, VERT, CYAN, BLEU, MAGENTA};
  int tShift = (int)((millis() / 80UL) % 7UL);
  for (int i = 0; i < (int)texteDefilant.length(); i++) {
    int xLettre = positionX + i * 6;
    if (xLettre > -6 && xLettre < PANEL_RES_X) {
      display->setTextColor(arc7[(i + tShift) % 7]);
      display->setCursor(xLettre, 2);
      display->print(texteDefilant[i]);
    }
  }

  display->drawFastHLine(0, 13, 64, display->color565(50, 50, 50));

  // ── Horloge avec pulse glow à chaque seconde ──────────────────
  bool nuit = estModeNuit();
  uint16_t cHeure = nuit ? display->color565(0, 130, 190) : CYAN;
  uint16_t cDate  = nuit ? display->color565(0, 150,  55) : VERT;

  // Calcul de la couleur de glow (blanc→cHeure sur DUREE_PULSE ms)
  uint16_t cGlow = cHeure;
  if (pulseActif) {
    unsigned long age = millis() - debutPulse;
    if (age >= DUREE_PULSE) {
      pulseActif = false;
    } else {
      // fade: blanc brillant au début, retour à cHeure à la fin
      uint8_t f = (uint8_t)(255 - (age * 255UL / DUREE_PULSE));
      cGlow = display->color565(f, 255, 255);  // cyan→blanc selon fade
    }
  }

  // Halo : dessiner les chiffres décalés de 1px en couleur douce avant le dessin principal
  if (pulseActif) {
    unsigned long age = millis() - debutPulse;
    uint8_t halo = (uint8_t)(80 - (age * 80UL / DUREE_PULSE));
    uint16_t cHalo = display->color565(0, halo, halo);
    display->setTextColor(cHalo); display->setCursor(0, 17); display->print(bufH);
    display->setTextColor(colonVisible ? cHalo : 0); display->print(":");
    display->setTextColor(cHalo); display->print(bufM);
    display->setTextColor(cHalo); display->setCursor(2, 17); display->print(bufH);
    display->setTextColor(colonVisible ? cHalo : 0); display->print(":");
    display->setTextColor(cHalo); display->print(bufM);
  }

  // Chiffres principaux (couleur glow ou normale)
  display->setTextColor(cGlow);                    display->setCursor(1, 17); display->print(bufH);
  display->setTextColor(colonVisible ? cGlow : 0); display->print(":");
  display->setTextColor(cGlow);                    display->print(bufM);

  display->setTextColor(cDate); display->setCursor(1, 25); display->print(tamponDate);

  display->drawFastVLine(32, 14, 17, display->color565(50, 50, 50));

  // Température (DHT en priorité, sinon météo)
  char texteTemp[8];
  sprintf(texteTemp, "%dC", dhtOK ? temperatureDHT : meteo_temp);
  display->setTextColor(couleurTemperature(dhtOK ? temperatureDHT : meteo_temp));
  display->setCursor(34, 17);
  display->print(texteTemp);

  // Conditions météo
  String meteoAff = emojiMeteo();
  if (meteoAff.length() > 5) meteoAff = meteoAff.substring(0, 5);
  display->setTextColor(couleurMeteo());
  display->setCursor(34, 25);
  display->print(meteoAff);

  mettreAJourSparkles();

  positionX -= vitesse;
  if (positionX < -largeurTexte) positionX = PANEL_RES_X;

  delay(30);
}
