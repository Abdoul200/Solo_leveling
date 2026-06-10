from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Preformatted,
    Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

doc = SimpleDocTemplate(
    "/home/user/Solo_leveling/mplabx_tp/TP_Lab3_ADC_Solutions.pdf",
    pagesize=A4,
    leftMargin=1.8*cm, rightMargin=1.8*cm,
    topMargin=1.8*cm, bottomMargin=1.8*cm,
    title="TP Lab 3 - ADC PIC18F4525",
)

styles = getSampleStyleSheet()
DARK_BLUE  = colors.HexColor("#1a2050")
MED_BLUE   = colors.HexColor("#3250a0")
LIGHT_BG   = colors.HexColor("#f0f2f8")
CODE_BG    = colors.HexColor("#f4f5fa")
NOTE_BG    = colors.HexColor("#fffae0")
NOTE_BORD  = colors.HexColor("#ddb800")

title_style  = ParagraphStyle("t",  parent=styles["Title"],  fontSize=18, textColor=DARK_BLUE, spaceAfter=4, alignment=TA_CENTER)
sub_style    = ParagraphStyle("s",  parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#555"), alignment=TA_CENTER, spaceAfter=14)
section_style= ParagraphStyle("sc", parent=styles["Heading1"], fontSize=12, textColor=colors.white, backColor=MED_BLUE, spaceAfter=6, spaceBefore=10, leftIndent=-4, borderPad=4)
subsec_style = ParagraphStyle("ss", parent=styles["Heading2"], fontSize=10, textColor=DARK_BLUE, backColor=colors.HexColor("#dde3f5"), spaceAfter=4, spaceBefore=8, leftIndent=-2, borderPad=3)
body_style   = ParagraphStyle("b",  parent=styles["Normal"], fontSize=9, leading=13, spaceAfter=4, textColor=colors.HexColor("#222"))
note_style   = ParagraphStyle("n",  parent=styles["Normal"], fontSize=8.5, leading=12, textColor=colors.HexColor("#5a4000"), backColor=NOTE_BG, borderColor=NOTE_BORD, borderWidth=1, borderPad=6, spaceAfter=6)
code_style   = ParagraphStyle("c",  parent=styles["Code"],   fontSize=7.2, leading=10, fontName="Courier", backColor=CODE_BG, borderColor=colors.HexColor("#b4b9d2"), borderWidth=0.5, borderPad=6, spaceAfter=6, textColor=colors.HexColor("#14143c"))

def S(t, st=body_style): return Paragraph(t, st)
def SP(n=6): return Spacer(1, n)
def HR(): return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=4, spaceBefore=4)
def section(t): return S(f"  {t}", section_style)
def subsec(t):  return S(f"  {t}", subsec_style)
def body(t):    return S(t, body_style)
def note(t):    return S(t, note_style)
def code(t):    return Preformatted(t.strip(), code_style, maxLineLength=100, newLineChars="")

story = []

# ── TITRE ──────────────────────────────────────────────────────
story += [
    SP(10),
    S("TP Lab 3 — Analogue-Digital Converter (ADC)", title_style),
    S("PIC18F4525  |  MPLAB X  |  Compilateur XC8", sub_style),
    HR(), SP(4),
]

# ── MODULES COMMUNS ────────────────────────────────────────────
story += [
    section("Modules communs à tous les exercices"),
    body("<b>Ces deux fonctions sont utilisées dans les 3 exercices.</b> À copier dans chaque projet."),
    SP(4),
    subsec("init_ADC() — Initialisation du module ADC"),
    body(
        "Registres à configurer :<br/>"
        "• <b>ADCON1 = 0x0E</b> : PCFG=1110 → seul AN0 (RA0) est analogique, reste = numérique<br/>"
        "• <b>ADCON0 = 0x01</b> : CHS=0000 (canal 0=AN0), ADON=1 (ADC activé)<br/>"
        "• <b>ADCON2 = 0b10110111</b> : ADFM=1 (résultat à droite), ACQT=110 (16 TAD), ADCS=111 (FRC)"
    ),
    code("""\
void init_ADC(void) {
    ADCON1 = 0x0E;           // AN0 seul en analogique, reste = numerique
    ADCON0 = 0x01;           // Canal AN0 (CHS=0000), ADC ON (ADON=1)
    ADCON2 = 0b10110111;     // ADFM=1 (droite), ACQT=16TAD, ADCS=FRC
}"""),
    note(
        "Décodage ADCON2 = 0b10110111 :\n"
        "  bit 7  ADFM  = 1   → résultat justifié à DROITE (valeur 0-1023 dans ADRESH:ADRESL)\n"
        "  bit 6        = 0   → non utilisé\n"
        "  bits 5:3 ACQT= 110 → temps d'acquisition = 16 TAD\n"
        "  bits 2:0 ADCS= 111 → horloge = FRC (oscillateur RC dédié à l'ADC)"
    ),
    SP(4),
    subsec("conversion() — Démarrer et lire la conversion ADC"),
    body(
        "• Mettre GO_nDONE à 1 → déclenche la conversion<br/>"
        "• Attendre que GO_nDONE revienne à 0 (conversion terminée automatiquement)<br/>"
        "• Résultat : ADRESH (2 bits hauts) + ADRESL (8 bits bas) = valeur 10 bits (0 à 1023)"
    ),
    code("""\
unsigned int conversion(void) {
    ADCON0bits.GO_nDONE = 1;           // Demarrer la conversion
    while (ADCON0bits.GO_nDONE);       // Attendre la fin
    return ((unsigned int)ADRESH << 8) | ADRESL;  // Retourner valeur 10 bits
}"""),
    note(
        "Pourquoi 'unsigned int' et pas 'int' ?\n"
        "L'ADC retourne une valeur de 0 à 1023. Un 'int' signé irait de -32768 à +32767,\n"
        "mais par convention le TP impose 'unsigned int' pour indiquer que la valeur est\n"
        "toujours positive (jamais négative)."
    ),
    PageBreak(),
]

# ── EX 1 ────────────────────────────────────────────────────────
story += [
    section("Exercice 1 — Chirping Buzzer (Buzzer à fréquence variable)"),
    body(
        "<b>Objectif :</b> Utiliser l'ADC pour faire varier la fréquence du buzzer.<br/>"
        "• Potentiomètre sur <b>RA0</b> (AN0) — Buzzer sur <b>RC2</b><br/>"
        "• Tourner le potentiomètre → change la fréquence du son (effet 'chirping')"
    ),
    SP(4),
    subsec("buzzer_on(int delay) — Son à fréquence variable"),
    body(
        "<b>Pourquoi ne pas utiliser __delay_ms(val) ?</b><br/>"
        "__delay_ms() exige une <b>constante</b> connue à la compilation. On ne peut pas passer une variable.<br/>"
        "→ On utilise une <b>boucle for</b> à la place : le nombre d'itérations = le délai."
    ),
    code("""\
void buzzer_on(int delay) {
    int i;
    LATCbits.LATC2 = 1;                // RC2 = 1 (buzzer ON)
    for (i = 0; i < delay; i++);       // Attendre 'delay' iterations
    LATCbits.LATC2 = 0;                // RC2 = 0 (buzzer OFF)
    for (i = 0; i < delay; i++);       // Attendre 'delay' iterations
    // -> Plus delay est grand -> periode plus longue -> son grave
    // -> Plus delay est petit -> periode plus courte -> son aigu
}"""),
    subsec("Code complet — Lab3_Ex1_Chirping_buzzer.c"),
    code("""\
#include <xc.h>
#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

// -- init_ADC() et conversion() (voir modules communs ci-dessus) --

void buzzer_on(int delay) {
    int i;
    LATCbits.LATC2 = 1;
    for (i = 0; i < delay; i++);
    LATCbits.LATC2 = 0;
    for (i = 0; i < delay; i++);
}

unsigned int val;   // IMPORTANT : unsigned int, pas int !

void main(void) {
    OSCCON = 0x72;              // Oscillateur interne 8 MHz
    TRISAbits.TRISA0 = 1;      // RA0 = entree (potentiometre AN0)
    TRISCbits.TRISC2 = 0;      // RC2 = sortie (buzzer)
    LATCbits.LATC2   = 0;      // Buzzer eteint au demarrage

    init_ADC();                 // Initialiser l'ADC

    while (1) {
        val = conversion();     // Lire le potentiometre (0 a 1023)
        buzzer_on(val);         // Produire le son avec ce delai
        // Tourner le potentiometre -> frequence du son change
    }
}"""),
    note(
        "Comment ça marche :\n"
        "  Potentiomètre à 0  → ADC = 0    → delay = 0    → son très aigu (très rapide)\n"
        "  Potentiomètre à 50% → ADC = 512  → delay = 512  → son moyen\n"
        "  Potentiomètre à max → ADC = 1023 → delay = 1023 → son très grave (très lent)"
    ),
    PageBreak(),
]

# ── EX 2 ────────────────────────────────────────────────────────
story += [
    section("Exercice 2 — ADC LED (Affichage sur LEDs)"),
    body(
        "<b>Objectif :</b> Allumer les LEDs en fonction de la valeur du potentiomètre.<br/>"
        "• Potentiomètre sur <b>RA0</b> (AN0) — LEDs sur <b>RB0 à RB3</b> (PORTB)<br/>"
        "• ADC 10 bits → plage 0-1023 divisée en 4 zones de 256"
    ),
    SP(4),
    subsec("Tableau de mapping ADC → LEDs"),
]

tdata = [
    ["Valeur ADC", "Tension approx.", "LATB (binaire)", "LEDs allumées"],
    ["0 à 255",    "0 à ~1.25 V",     "0b00000001",     "1 LED (RB0)"],
    ["256 à 511",  "~1.25 à ~2.5 V",  "0b00000011",     "2 LEDs (RB0-RB1)"],
    ["512 à 767",  "~2.5 à ~3.75 V",  "0b00000111",     "3 LEDs (RB0-RB2)"],
    ["768 à 1023", "~3.75 à 5 V",     "0b00001111",     "4 LEDs (RB0-RB3)"],
]
t = Table(tdata, colWidths=[3.5*cm, 3.5*cm, 4.5*cm, 4.5*cm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), MED_BLUE), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#eef0f8")]),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#aaaacc")),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
]))
story += [SP(4), t, SP(6)]

story += [
    subsec("Code complet — Lab3_Ex2_ADC_LED.c"),
    code("""\
#include <xc.h>
#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

// -- init_ADC() et conversion() (voir modules communs) --

unsigned int val;

void main(void) {
    OSCCON = 0x72;
    TRISB  = 0x00;             // PORTB en SORTIE (LEDs sur RB0-RB3)
    TRISAbits.TRISA0 = 1;     // RA0 = entree (potentiometre AN0)
    LATB   = 0x00;             // LEDs eteintes

    init_ADC();

    while (1) {
        val = conversion();    // Lire ADC (0 a 1023)

        if (val < 256) {
            LATB = 0b00000001; // 1 LED allumee  (~0 a 1.25V)
        } else if (val < 512) {
            LATB = 0b00000011; // 2 LEDs allumees (~1.25 a 2.5V)
        } else if (val < 768) {
            LATB = 0b00000111; // 3 LEDs allumees (~2.5 a 3.75V)
        } else {
            LATB = 0b00001111; // 4 LEDs allumees (~3.75 a 5V)
        }
        // Tourner le potentiometre -> les LEDs s'allument progressivement
    }
}"""),
    note(
        "Explication de LATB vs PORTB :\n"
        "On utilise LATB (pas PORTB) pour écrire sur le port.\n"
        "PORTB lit l'état physique des broches, LATB écrit la valeur sur les sorties.\n"
        "Toujours utiliser LAT pour écrire, PORT pour lire."
    ),
    PageBreak(),
]

# ── EX 3 ────────────────────────────────────────────────────────
story += [
    section("Exercice 3 — Voltmètre avec Afficheur LCD"),
    body(
        "<b>Objectif :</b> Afficher la tension du potentiomètre sur un LCD.<br/>"
        "• Potentiomètre sur <b>RA0</b> (AN0)<br/>"
        "• Afficheur LCD : données sur <b>PORTD</b>, contrôle sur <b>PORTE</b><br/>"
        "• Ligne 1 : titre fixe — Ligne 2 : tension en temps réel"
    ),
    SP(4),
    subsec("Étapes pour ajouter la bibliothèque LCD dans MPLAB X"),
    body(
        "1. Télécharger <b>LCD_Library.c</b> et <b>LCD_Library.h</b> depuis Moodle<br/>"
        "2. Copier-coller les 2 fichiers dans le dossier du projet<br/>"
        "3. Dans MPLAB X : clic droit <b>Source Files</b> → <b>Add Existing Item</b> → choisir LCD_Library.c<br/>"
        "4. Dans <b>Header Files</b> : Add Existing Item → choisir LCD_Library.h<br/>"
        "5. Ajouter <b>#include \"LCD_Library.h\"</b> dans votre fichier .c"
    ),
    SP(4),
    subsec("Formule de conversion ADC → Tension"),
    body(
        "ADC 10 bits : <b>0 à 1023</b> correspond à <b>0 à 5V</b> (VDD = 5V)<br/>"
        "Formule : <b>V = val × 5.0 / 1023.0</b><br/>"
        "Exemples : val=0 → 0.00V | val=512 → 2.50V | val=1023 → 5.00V<br/>"
        "<b>Déclarer V en float</b> (pas int !) car la tension a des décimales."
    ),
    SP(4),
    subsec("Code complet — Lab3_Ex3_Voltmeter.c"),
    code("""\
#include <xc.h>
#include <stdio.h>           // Pour sprintf()
#include "LCD_Library.h"     // Telecharger sur Moodle !
#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

// -- init_ADC() et conversion() (voir modules communs) --

unsigned int val;   // Valeur brute ADC (0 a 1023)

void main(void) {
    char  buffer[17];         // Tampon pour sprintf (16 chars + fin de chaine)
    float v;                  // Tension calculee (FLOAT, pas int !)

    OSCCON = 0x72;            // Oscillateur 8 MHz
    TRISD  = 0x00;            // PORTD en SORTIE (donnees LCD)
    TRISE  = 0x00;            // PORTE en SORTIE (RS, RW, E du LCD)
    TRISAbits.TRISA0 = 1;    // RA0 en entree (potentiometre AN0)

    init_ADC();               // Initialiser l'ADC

    lcd_init();               // Configurer le LCD
    lcd_on();                 // Allumer l'affichage

    goto_line(1);             // Curseur sur ligne 1
    print_string("PIC18F4525"); // Titre fixe

    while (1) {
        goto_line(2);                         // Curseur sur ligne 2
        val = conversion();                   // Lire ADC (0-1023)
        v = (float)val * 5.0 / 1023.0;       // Convertir en tension
        sprintf(buffer, "Vol: %4.2f V  ", v); // Formater (ex: "Vol: 3.25 V")
        print_string(buffer);                 // Afficher sur LCD
        // Tourner le potentiometre : tension varie de 0.00 a 5.00 V
    }
}"""),
    note(
        "Explication de sprintf :\n"
        "  sprintf(buffer, \"Vol: %4.2f V\", v)\n"
        "  %4.2f → affiche un float avec 4 chiffres au total et 2 décimales\n"
        "  Exemple : v = 3.252 → affiche '3.25'\n"
        "  Les 2 espaces à la fin ('  ') effacent les anciens caractères sur le LCD."
    ),
    SP(6),
    subsec("Fonctions LCD à connaître"),
]

lcd_table = [
    ["Fonction", "Ce qu'elle fait"],
    ["lcd_init()", "Configure et initialise le LCD"],
    ["lcd_on()", "Allume l'affichage"],
    ["lcd_clr()", "Efface tout le LCD"],
    ["goto_line(n)", "Place le curseur au début de la ligne n (1 ou 2)"],
    ["print_string(s)", "Affiche la chaîne de caractères s sur le LCD"],
]
lt = Table(lcd_table, colWidths=[5*cm, 11*cm])
lt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), MED_BLUE), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#eef0f8")]),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#aaaacc")),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("LEFTPADDING", (0,0), (-1,-1), 5),
    ("FONTNAME", (0,1), (0,-1), "Courier"), ("FONTSIZE", (0,1), (0,-1), 8),
]))
story += [SP(4), lt, PageBreak()]

# ── RÉCAP ───────────────────────────────────────────────────────
story += [
    section("Récapitulatif — Points clés Lab 3"),
    SP(4),
    body("<b>1.</b>  ADCON1 = 0x0E → seul AN0 est analogique (RA0 = potentiomètre)."),
    body("<b>2.</b>  ADCON2 = 0b10110111 → résultat <b>à droite</b> (0-1023), 16 TAD, FRC."),
    body("<b>3.</b>  Déclarer les variables ADC en <b>unsigned int</b> (jamais int)."),
    body("<b>4.</b>  Pour un délai variable : utiliser une <b>boucle for</b>, pas __delay_ms()."),
    body("<b>5.</b>  Pour la tension : déclarer en <b>float</b> et utiliser la formule V = val × 5.0 / 1023.0."),
    body("<b>6.</b>  Toujours utiliser <b>LAT</b> pour écrire sur un port (pas PORT)."),
    SP(6),
    subsec("Schéma de connexion résumé"),
    code("""\
PIC18F4525
   RA0 ---[Potentiometre : milieu]--- RA0         (AN0 = entree ADC)
            [une extremite]         --- GND
            [autre extremite]       --- +5V
   RC2 ---[Buzzer piezoelectrique]--- GND          (Ex 1)
   RB0-RB3 ---[LEDs avec R 470Ω]--- GND           (Ex 2)
   PORTD (RD0-RD7) --- [Donnees LCD D0-D7]        (Ex 3)
   RE0 (RS), RE1 (RW), RE2 (E) --- [Controle LCD] (Ex 3)"""),
]

doc.build(story)
print("PDF genere : TP_Lab3_ADC_Solutions.pdf")
