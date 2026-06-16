#include <WiFi.h>
#include <time.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
#include <Adafruit_GFX.h>
#include <Wire.h>
#include <BH1750.h>

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
const char* NOM_UTILISATEUR = "Abdul";   // ← changer ici pour personnaliser

#define PANEL_RES_X  64
#define PANEL_RES_Y  32
#define PANEL_CHAIN   1

#define INTERVALLE_METEO    600000UL  // 10 min
#define INTERVALLE_CAPTEUR    5000UL  // 5 s
#define DUREE_CAPTEUR         3000UL  // durée écran lux
#define INTERVALLE_LUX        2000UL  // lecture BH1750 toutes les 2 s

// ============================================================
//  VARIABLES GLOBALES
// ============================================================
MatrixPanel_I2S_DMA* display = nullptr;
BH1750 capteurLumiere;

String texteDefilant = "";
int    positionX     = PANEL_RES_X;
const int vitesse    = 2;

uint16_t ROUGE, VERT, BLEU, JAUNE, CYAN, BLANC, MAGENTA, ORANGE;

int  meteo_temp = 0;
int  meteo_code = 800;
char meteo_desc[32] = "---";

unsigned long derniereMeteo           = 0;
unsigned long dernierAffichageCapteur = 0;
unsigned long derniereLectureLux      = 0;

bool          modeCapteur      = false;
unsigned long debutModeCapteur = 0;

float luxActuelle = 0.0f;
float luxMin      = 99999.0f;
float luxMax      = 0.0f;

bool systemePret = false;

bool colonVisible = true;
int  derniereSec  = -1;

// ============================================================
//  ANIMATION ATTENTE WIFI — variables
// ============================================================
struct Balle {
  float    x, y, vx, vy;
  uint16_t couleur;
  uint8_t  rayon;
};

#define NB_BALLES 3
Balle balles[NB_BALLES];

String msgWifi        = "";
int    largeurMsgWifi = 0;
int    animScrollPos  = PANEL_RES_X;
int    compteurAnim   = 0;
unsigned long dernierFrameAnim = 0;

// ============================================================
//  UTILITAIRES
// ============================================================
const char* jourFrancais(int wday) {
  const char* j[] = {"Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"};
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

// Message contextuel selon l'heure — personnalisé avec NOM_UTILISATEUR
const char* messagePersonnel() {
  struct tm t;
  if (!getLocalTime(&t)) return "";
  if (t.tm_hour >= 6  && t.tm_hour < 12) return "Bonjour Abdul !";
  if (t.tm_hour >= 12 && t.tm_hour < 14) return "Bon appetit !";
  if (t.tm_hour >= 14 && t.tm_hour < 18) return "Bonne aprem !";
  if (t.tm_hour >= 18 && t.tm_hour < 22) return "Bonne soiree !";
  return "Bonne nuit...";
}

// ============================================================
//  ANIMATION DEMARRAGE PERSONNALISEE
// ============================================================
void animationDemarrage() {
  // Phase 1 : scan cyberpunk de gauche à droite (~380 ms)
  for (int x = 0; x < PANEL_RES_X; x++) {
    display->fillScreen(0);
    for (int dx = 0; dx <= 5 && x - dx >= 0; dx++) {
      uint8_t v = (uint8_t)(210 - dx * 38);
      display->drawFastVLine(x - dx, 0, PANEL_RES_Y,
                             display->color565(0, (uint8_t)(v / 4), v));
    }
    delay(6);
  }
  display->fillScreen(0);

  // Bordures décoratives haut/bas
  display->drawFastHLine(0, 0,  PANEL_RES_X, display->color565(0, 80, 140));
  display->drawFastHLine(0, 31, PANEL_RES_X, display->color565(0, 80, 140));

  // Phase 2 : "Bonjour" lettre par lettre en arc-en-ciel
  const uint16_t arc[] = {ROUGE, ORANGE, JAUNE, VERT, CYAN, BLEU, MAGENTA};
  const char* msg1 = "Bonjour";
  int x1 = (PANEL_RES_X - (int)strlen(msg1) * 6) / 2;
  for (int i = 0; i < (int)strlen(msg1); i++) {
    display->setTextColor(arc[i % 7]);
    display->setCursor(x1 + i * 6, 3);
    display->print(msg1[i]);
    delay(90);
  }
  delay(250);

  // Séparateur central décoratif
  display->drawFastHLine(8, 13, 48, display->color565(60, 40, 0));

  // Phase 3 : nom de l'utilisateur en jaune avec étincelles aléatoires
  String msgNom = String(NOM_UTILISATEUR) + " !";
  int xNom = (PANEL_RES_X - (int)msgNom.length() * 6) / 2;
  for (int i = 0; i < (int)msgNom.length(); i++) {
    display->setTextColor(JAUNE);
    display->setCursor(xNom + i * 6, 18);
    display->print(msgNom[i]);
    display->drawPixel(random(2, 62), random(14, 30), BLANC);
    display->drawPixel(random(2, 62), random(14, 30), CYAN);
    delay(110);
  }

  // Phase 4 : pulsations lumineuses (flash x5)
  delay(350);
  for (int fl = 0; fl < 5; fl++) {
    display->setBrightness8(fl % 2 == 0 ? 200 : 70);
    delay(70);
  }
  display->setBrightness8(90);
  delay(250);

  // Phase 5 : wipe vers le bas
  for (int y = 0; y < PANEL_RES_Y; y++) {
    display->drawFastHLine(0, y, PANEL_RES_X, 0);
    delay(12);
  }
}

// ============================================================
//  ANIMATION ATTENTE WIFI
// ============================================================
void animationAttenteWifi() {
  unsigned long now = millis();
  if (now - dernierFrameAnim < 35) return;   // ~28 fps
  dernierFrameAnim = now;
  compteurAnim++;

  display->fillScreen(0);

  // Bordure pulsante (violet qui respire)
  float pulse = sinf(compteurAnim * 0.12f);
  uint8_t br  = (uint8_t)((pulse + 1.0f) * 55.0f);
  display->drawRect(0, 0, 64, 32, display->color565(br, 0, (uint8_t)(br * 2)));

  // 3 balles rebondissantes
  for (int i = 0; i < NB_BALLES; i++) {
    balles[i].x += balles[i].vx;
    balles[i].y += balles[i].vy;

    float xMin = 1.0f + balles[i].rayon;
    float xMax = 62.0f - balles[i].rayon;
    float yMin = 1.0f + balles[i].rayon;
    float yMax = 19.0f - balles[i].rayon;

    if (balles[i].x <= xMin || balles[i].x >= xMax) balles[i].vx = -balles[i].vx;
    if (balles[i].y <= yMin || balles[i].y >= yMax) balles[i].vy = -balles[i].vy;

    balles[i].x = constrain(balles[i].x, xMin, xMax);
    balles[i].y = constrain(balles[i].y, yMin, yMax);

    display->fillCircle((int)balles[i].x, (int)balles[i].y,
                        balles[i].rayon, balles[i].couleur);
  }

  // "NO WIFI!" clignotant
  uint16_t cTxt = (compteurAnim / 7) % 2 == 0 ? JAUNE : ROUGE;
  display->setTextColor(cTxt);
  display->setCursor(8, 6);
  display->print("NO WIFI!");

  // Spinner coin haut droit
  const char* sp[] = {"|", "/", "-", "\\"};
  display->setTextColor(CYAN);
  display->setCursor(57, 1);
  display->print(sp[(compteurAnim / 4) % 4]);

  display->drawFastHLine(0, 20, 64, display->color565(40, 40, 40));

  // Défilement rainbow bas : SSID à connecter (palette 7 couleurs)
  const uint16_t pal7[] = {ROUGE, ORANGE, JAUNE, VERT, CYAN, BLEU, MAGENTA};
  for (int i = 0; i < (int)msgWifi.length(); i++) {
    int xL = animScrollPos + i * 6;
    if (xL > -6 && xL < 64) {
      display->setTextColor(pal7[(i + compteurAnim / 2) % 7]);
      display->setCursor(xL, 23);
      display->print(msgWifi[i]);
    }
  }
  animScrollPos -= 2;
  if (animScrollPos < -largeurMsgWifi) animScrollPos = PANEL_RES_X;
}

// ============================================================
//  METEO
// ============================================================
void recupererMeteo() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = "http://api.openweathermap.org/data/2.5/weather?q=";
  url += VILLE;
  url += "&appid=";
  url += OWM_API_KEY;
  url += "&units=metric&lang=fr";

  Serial.print("Meteo... ");
  HTTPClient http;
  http.begin(url);
  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    if (!deserializeJson(doc, payload)) {
      meteo_temp = (int)doc["main"]["temp"].as<float>();
      meteo_code = doc["weather"][0]["id"].as<int>();
      const char* desc = doc["weather"][0]["description"] | "---";
      strncpy(meteo_desc, desc, sizeof(meteo_desc) - 1);
      meteo_desc[sizeof(meteo_desc) - 1] = '\0';
      Serial.printf("OK %dC %s\n", meteo_temp, meteo_desc);
    } else { Serial.println("Erreur JSON"); }
  } else { Serial.printf("Erreur HTTP %d\n", code); }

  http.end();
}

String emojiMeteo() {
  struct tm now;
  bool nuit = false;
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
//  AUTO-BRIGHTNESS BH1750
// ============================================================
void ajusterBrillance(float lux) {
  uint8_t b;
  if      (lux < 5)    b = 8;
  else if (lux < 50)   b = 25;
  else if (lux < 200)  b = 60;
  else if (lux < 1000) b = 100;
  else if (lux < 5000) b = 170;
  else                  b = 220;
  display->setBrightness8(b);
}

// ============================================================
//  ECRAN CAPTEUR BH1750
// ============================================================
void afficherEcranCapteur() {
  display->fillScreen(0);

  display->setTextColor(CYAN);
  display->setCursor(2, 1);
  display->print("BH1750");

  const char* cond;
  uint16_t    coul;
  if      (luxActuelle < 1.0f)     { cond = "Nuit";   coul = BLEU;    }
  else if (luxActuelle < 50.0f)    { cond = "Sombre"; coul = MAGENTA; }
  else if (luxActuelle < 300.0f)   { cond = "Tamise"; coul = CYAN;    }
  else if (luxActuelle < 2000.0f)  { cond = "Bureau"; coul = BLANC;   }
  else if (luxActuelle < 10000.0f) { cond = "Clair";  coul = JAUNE;   }
  else                              { cond = "Soleil"; coul = ROUGE;   }

  display->setTextColor(coul);
  display->setCursor(63 - (int)strlen(cond) * 6, 1);
  display->print(cond);

  display->drawFastHLine(0, 10, 64, display->color565(50, 50, 50));

  char bufLux[16];
  if      (luxActuelle < 1.0f)   sprintf(bufLux, "< 1 lx");
  else if (luxActuelle < 100.0f) sprintf(bufLux, "%.1f lx", luxActuelle);
  else                            sprintf(bufLux, "%.0f lx", luxActuelle);

  display->setTextColor(JAUNE);
  display->setCursor(2, 12);
  display->print(bufLux);

  // Barre de progression (0 → 10 000 lux → 60 px)
  int barre = (int)((min(luxActuelle, 10000.0f) / 10000.0f) * 60.0f);
  display->drawRect(1, 21, 62, 4, display->color565(40, 40, 40));
  if (barre > 0) {
    uint16_t cBar = luxActuelle < 100 ? BLEU : (luxActuelle < 3000 ? VERT : ROUGE);
    display->fillRect(2, 22, barre, 2, cBar);
  }

  char bufMin[10], bufMax[10];
  sprintf(bufMin, "v%.0f", luxMin >= 99999.0f ? 0.0f : luxMin);
  sprintf(bufMax, "^%.0f", luxMax);

  display->setTextColor(display->color565(0, 200, 200));
  display->setCursor(1, 25);
  display->print(bufMin);

  display->setTextColor(ROUGE);
  display->setCursor(63 - (int)strlen(bufMax) * 6, 25);
  display->print(bufMax);
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0));   // entropie pour les étincelles

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

  ROUGE   = display->color565(255,   0,   0);
  VERT    = display->color565(  0, 255,   0);
  BLEU    = display->color565(  0,   0, 255);
  JAUNE   = display->color565(255, 255,   0);
  CYAN    = display->color565(  0, 255, 255);
  BLANC   = display->color565(255, 255, 255);
  MAGENTA = display->color565(255,   0, 255);
  ORANGE  = display->color565(255, 140,   0);

  Wire.begin(21, 22);
  if (capteurLumiere.begin(BH1750::CONTINUOUS_HIGH_RES_MODE))
    Serial.println("BH1750 OK");
  else
    Serial.println("BH1750 non detecte");

  // Animation de démarrage avant connexion WiFi
  animationDemarrage();

  balles[0] = { 8.0f,  8.0f,  1.4f,  0.9f, ROUGE,   2};
  balles[1] = {40.0f,  5.0f, -1.1f,  1.3f, VERT,    2};
  balles[2] = {25.0f, 14.0f,  0.8f, -1.1f, MAGENTA, 1};

  msgWifi        = "  Connexion...  SSID: " + String(SSID_WIFI) + "   ";
  largeurMsgWifi = msgWifi.length() * 6;

  Serial.println("Demarrage WiFi...");
  WiFi.begin(SSID_WIFI, PASSWORD_WIFI);

  positionX = PANEL_RES_X;
}

// ============================================================
//  LOOP
// ============================================================
void loop() {

  // ── CAS 1 — WiFi non connecté ────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    systemePret = false;
    animationAttenteWifi();
    return;
  }

  // ── CAS 2 — Première connexion / reconnexion ─────────────────
  if (!systemePret) {
    display->fillScreen(0);
    display->setTextColor(VERT);
    display->setCursor(4, 8);
    display->print("WiFi OK !");
    display->setTextColor(CYAN);
    display->setCursor(2, 19);
    display->print("Synchro...");

    configTime(DECALAGE_UTC, HEURE_ETE, SERVEUR_NTP);
    struct tm t;
    int essais = 0;
    while (!getLocalTime(&t) && essais++ < 10) delay(500);
    Serial.println("Heure OK");

    recupererMeteo();

    derniereMeteo           = millis();
    dernierAffichageCapteur = millis();
    derniereLectureLux      = millis();
    systemePret             = true;

    display->fillScreen(0);
    positionX     = PANEL_RES_X;
    animScrollPos = PANEL_RES_X;
    return;
  }

  // ── CAS 3 — Mode normal ──────────────────────────────────────

  if (millis() - derniereMeteo >= INTERVALLE_METEO) {
    derniereMeteo = millis();
    recupererMeteo();
  }

  if (millis() - derniereLectureLux >= INTERVALLE_LUX) {
    derniereLectureLux = millis();
    float l = capteurLumiere.readLightLevel();
    if (l >= 0.0f) {
      luxActuelle = l;
      if (luxActuelle < luxMin) luxMin = luxActuelle;
      if (luxActuelle > luxMax) luxMax = luxActuelle;
      ajusterBrillance(luxActuelle);
    }
  }

  if (!modeCapteur && (millis() - dernierAffichageCapteur >= INTERVALLE_CAPTEUR)) {
    modeCapteur      = true;
    debutModeCapteur = millis();
  }

  if (modeCapteur) {
    if (millis() - debutModeCapteur >= DUREE_CAPTEUR) {
      modeCapteur = false;
      dernierAffichageCapteur = millis();
    } else {
      afficherEcranCapteur();
      delay(100);
      return;
    }
  }

  // ── Affichage normal ─────────────────────────────────────────

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

    // Basculer les ":" à chaque nouvelle seconde
    if (infosTemps.tm_sec != derniereSec) {
      derniereSec  = infosTemps.tm_sec;
      colonVisible = !colonVisible;
    }
  }

  char bufLuxScroll[10];
  if (luxActuelle < 1.0f) sprintf(bufLuxScroll, "<1lx");
  else                     sprintf(bufLuxScroll, "%.0flx", luxActuelle);

  // Texte défilant personnalisé : message contextuel + météo + lux
  texteDefilant = String("  ") + String(messagePersonnel()) +
                  String("   ") +
                  String(bufJour) + String(" ") + String(tamponDate) +
                  String("   ") +
                  emojiMeteo() + String(" ") + String(meteo_temp) + String("C") +
                  String("   ") + String(bufLuxScroll) + String("   ");

  int largeurTexte = texteDefilant.length() * 6;

  display->fillScreen(0);

  // ── Zone haute : texte défilant arc-en-ciel 7 couleurs (y=2)
  const uint16_t arc7[] = {ROUGE, ORANGE, JAUNE, VERT, CYAN, BLEU, MAGENTA};
  for (int i = 0; i < (int)texteDefilant.length(); i++) {
    int xLettre = positionX + i * 6;
    if (xLettre > -6 && xLettre < PANEL_RES_X) {
      display->setTextColor(arc7[(i / 2) % 7]);
      display->setCursor(xLettre, 2);
      display->print(texteDefilant[i]);
    }
  }

  display->drawFastHLine(0, 13, 64, display->color565(50, 50, 50));

  // Couleurs adaptées au mode nuit (plus douces après 22h)
  bool nuit = estModeNuit();
  uint16_t cHeure = nuit ? display->color565(0, 130, 190) : CYAN;
  uint16_t cDate  = nuit ? display->color565(0, 150, 55)  : VERT;

  // ── Heure avec ":" clignotant (y=17) ────────────────────────
  display->setTextColor(cHeure);
  display->setCursor(1, 17);
  display->print(bufH);
  display->setTextColor(colonVisible ? cHeure : 0);
  display->print(":");
  display->setTextColor(cHeure);
  display->print(bufM);

  // ── Date (y=25) ──────────────────────────────────────────────
  display->setTextColor(cDate);
  display->setCursor(1, 25);
  display->print(tamponDate);

  display->drawFastVLine(32, 14, 17, display->color565(50, 50, 50));

  // ── Température avec couleur dynamique selon valeur (y=17) ───
  char texteTemp[6];
  sprintf(texteTemp, "%dC", meteo_temp);
  display->setTextColor(couleurTemperature(meteo_temp));
  display->setCursor(34, 17);
  display->print(texteTemp);

  // ── Météo (y=25) ─────────────────────────────────────────────
  String meteoAff = emojiMeteo();
  if (meteoAff.length() > 5) meteoAff = meteoAff.substring(0, 5);
  display->setTextColor(couleurMeteo());
  display->setCursor(34, 25);
  display->print(meteoAff);

  // ── Défilement ───────────────────────────────────────────────
  positionX -= vitesse;
  if (positionX < -largeurTexte) positionX = PANEL_RES_X;

  delay(30);
}
