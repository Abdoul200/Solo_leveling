from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Preformatted,
    Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

PAGE_W, PAGE_H = A4
MARGIN = 1.8 * cm

doc = SimpleDocTemplate(
    "/home/user/Solo_leveling/mplabx_tp/TP_Lab2_Solutions.pdf",
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title="TP Lab 2 - External Events PIC18F4525",
)

styles = getSampleStyleSheet()

# Custom styles
DARK_BLUE = colors.HexColor("#1a2050")
MED_BLUE  = colors.HexColor("#3250a0")
LIGHT_BG  = colors.HexColor("#f0f2f8")
CODE_BG   = colors.HexColor("#f4f5fa")
NOTE_BG   = colors.HexColor("#fffae0")
NOTE_BORDER = colors.HexColor("#ddb800")

title_style = ParagraphStyle("title_s", parent=styles["Title"],
    fontSize=18, textColor=DARK_BLUE, spaceAfter=4, alignment=TA_CENTER)

subtitle_style = ParagraphStyle("subtitle_s", parent=styles["Normal"],
    fontSize=10, textColor=colors.HexColor("#555555"), alignment=TA_CENTER, spaceAfter=14)

section_style = ParagraphStyle("section_s", parent=styles["Heading1"],
    fontSize=12, textColor=colors.white, backColor=MED_BLUE,
    spaceAfter=6, spaceBefore=10, leftIndent=-4, rightIndent=-4,
    borderPad=4)

subsec_style = ParagraphStyle("subsec_s", parent=styles["Heading2"],
    fontSize=10, textColor=DARK_BLUE, backColor=colors.HexColor("#dde3f5"),
    spaceAfter=4, spaceBefore=8, leftIndent=-2, borderPad=3)

body_style = ParagraphStyle("body_s", parent=styles["Normal"],
    fontSize=9, leading=13, spaceAfter=4, textColor=colors.HexColor("#222222"))

note_style = ParagraphStyle("note_s", parent=styles["Normal"],
    fontSize=8.5, leading=12, textColor=colors.HexColor("#5a4000"),
    backColor=NOTE_BG, borderColor=NOTE_BORDER, borderWidth=1,
    borderPad=6, spaceAfter=6)

code_style = ParagraphStyle("code_s", parent=styles["Code"],
    fontSize=7.2, leading=10, fontName="Courier",
    backColor=CODE_BG, borderColor=colors.HexColor("#b4b9d2"),
    borderWidth=0.5, borderPad=6, spaceAfter=6, textColor=colors.HexColor("#14143c"))


def S(txt, style=body_style): return Paragraph(txt, style)
def SP(n=6): return Spacer(1, n)
def HR(): return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=4, spaceBefore=4)

def section(txt): return S(f"  {txt}", section_style)
def subsec(txt):  return S(f"  {txt}", subsec_style)
def body(txt):    return S(txt, body_style)
def note(txt):    return S(txt, note_style)

def code(txt):
    return Preformatted(txt.strip(), code_style,
                        maxLineLength=100, newLineChars="")


# ── BUILD CONTENT ─────────────────────────────────────────────
story = []

# TITLE PAGE block
story += [
    SP(10),
    S("TP Lab 2 — External Events", title_style),
    S("PIC18F4525  |  MPLAB X  |  Compilateur XC8", subtitle_style),
    HR(),
    SP(4),
]

# ══════════════════════════════════════════════════════════════
# EX 1
# ══════════════════════════════════════════════════════════════
story += [
    section("Exercice 1 — Timer Switch (Minuterie)"),
    body("<b>Objectif :</b> Bouton S2 sur RB0, LED D2 sur RA4.<br/>"
         "• Appuyer S2 → LED s'allume<br/>"
         "• S2 maintenu → LED clignote chaque seconde<br/>"
         "• S2 relâché → LED reste allumée 5 secondes puis s'éteint"),
    SP(4),
    subsec("Calcul du Timer1 pour obtenir 1 seconde"),
    body("Fosc = 8 MHz → cycle instruction = 0,5 µs<br/>"
         "Prescaler 1:8 → 1 tick = 4 µs<br/>"
         "Valeur initiale = 65 536 − 250 000 = <b>15 536 = 0x3CB0</b><br/>"
         "(250 000 ticks × 4 µs = 1 000 000 µs = 1 seconde ✓)"),
    SP(4),
    subsec("Code complet — Ex1_Timer_switch.c"),
    code("""\
#include <xc.h>
#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

#define S2     PORTBbits.RB0   // Bouton S2 (1=relache, 0=appuye)
#define LED_D2 LATAbits.LATA4  // LED D2

/* Pause de 1 seconde via Timer1 */
void delay_1s(void) {
    T1CON = 0x31;             // Timer1 ON, prescaler 1:8, horloge interne
    TMR1H = 0x3C;             // 0x3CB0 = 15536 -> debordement en 1 seconde
    TMR1L = 0xB0;
    PIR1bits.TMR1IF = 0;      // Effacer le flag de debordement
    while (!PIR1bits.TMR1IF); // Attendre 1 seconde
    T1CONbits.TMR1ON = 0;     // Arreter le timer
}

void init_port(void) {
    OSCCON = 0x72;   // Oscillateur interne 8 MHz  (IRCF = 111)
    ADCON1 = 0x0F;   // IMPORTANT : toutes les broches en mode NUMERIQUE
    TRISB  = 0xFF;   // PORTB en ENTREE  (S2 sur RB0)
    TRISA  = 0x00;   // PORTA en SORTIE  (LED D2 sur RA4)
    LED_D2 = 0;      // LED eteinte au demarrage
}

void main(void) {
    int count = 0;
    init_port();

    while (1) {
        count = 0;
        while (S2 == 1);       // Attendre l'appui sur S2

        LED_D2 = 1;            // Allumer la LED

        while (1) {
            delay_1s();
            if (S2 == 0) {
                LED_D2 = !LED_D2;  // S2 encore appuye : clignoter
            } else {
                count++;           // S2 relache : compter les secondes
                if (count >= 5) break; // 5 secondes ecoules -> sortir
            }
        }
        LED_D2 = 0;            // Eteindre la LED
    }
}"""),
    note("POINTS CLES Ex1 :\n"
         "• ADCON1 = 0x0F  obligatoire — sans ça les broches sont analogiques et illisibles.\n"
         "• T1CON = 0x31 : TMR1ON=1, prescaler T1CKPS=11 (1:8), horloge interne.\n"
         "• On charge TMR1H:TMR1L = 0x3CB0 pour obtenir exactement 1 seconde de délai."),
    PageBreak(),
]

# ══════════════════════════════════════════════════════════════
# EX 2
# ══════════════════════════════════════════════════════════════
story += [
    section("Exercice 2 — External Interrupt INT0 + Buzzer"),
    body("<b>Objectif :</b> Bouton S3 sur RB0 (INT0), Buzzer sur RC2.<br/>"
         "• count démarre à 26<br/>"
         "• Chaque appui sur S3 → interruption INT0 → count--<br/>"
         "• Si count ≥ 7 → buzzer sonne à 500 Hz<br/>"
         "• Après 3 appuis, count &lt; 7 → buzzer s'arrête"),
    SP(4),
    subsec("Module 1 & 2 — buzzer_on() / buzzer_off()"),
    body("500 Hz → période = 2 ms → <b>1 ms à l'état HAUT</b> + <b>1 ms à l'état BAS</b>"),
    code("""\
void buzzer_on(void) {
    LATCbits.LATC2 = 1;    // RC2 = 1 pendant 1 ms
    __delay_ms(1);
    LATCbits.LATC2 = 0;    // RC2 = 0 pendant 1 ms
    __delay_ms(1);
    // -> une periode complete = 2 ms = frequence 500 Hz
}

void buzzer_off(void) {
    LATCbits.LATC2 = 0;    // Couper le buzzer immediatement
}"""),
    subsec("Module 3 — init_interrupt()"),
    code("""\
void init_interrupt(void) {
    INTCON2bits.INT0ED = 0;  // (a) Front DESCENDANT (appui = 1->0)
    INTCONbits.GIE    = 1;  // (b) Activer interruptions GLOBALES
    INTCONbits.PEIE   = 1;  // (c) Activer interruptions PERIPHERIQUES
    INTCONbits.INT0IE = 1;  // (d) Activer INT0 specifiquement
    INTCONbits.INT0IF = 0;  // (e) Effacer le flag au depart
}"""),
    note("Tableau des bits :\n"
         "  INT0ED (INTCON2) : 0=front descendant, 1=front montant\n"
         "  GIE    (INTCON)  : Interrupteur général — si 0, AUCUNE interruption ne marche\n"
         "  PEIE   (INTCON)  : Active les interruptions périphériques\n"
         "  INT0IE (INTCON)  : Active uniquement INT0\n"
         "  INT0IF (INTCON)  : Flag mis à 1 automatiquement quand INT0 se déclenche"),
    SP(4),
    subsec("Module 4 — ISR (Routine de Service d'Interruption)"),
    code("""\
void __interrupt() ISR(void) {
    INTCONbits.INT0IF = 0;  // !! TOUJOURS effacer le flag EN PREMIER !!
    count--;                 // Decrementer le compteur
}
// REGLE : si on oublie d'effacer INT0IF -> l'ISR se rappelle en boucle infinie -> programme bloque !"""),
    note("RÈGLE ABSOLUE : Effacer INT0IF EN PREMIER dans l'ISR.\n"
         "Si on ne l'efface pas, le PIC croit qu'une nouvelle interruption arrive\n"
         "en permanence → rappel infini de l'ISR → programme complètement bloqué."),
    SP(4),
    subsec("Module 5 — main()"),
    code("""\
#include <xc.h>
#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

volatile int count = 26;  // volatile : modifie dans l'ISR ET dans main()

// -- buzzer_on, buzzer_off, init_interrupt, ISR (voir ci-dessus) --

void main(void) {
    OSCCON = 0x72;              // Oscillateur 8 MHz
    ADCON1 = 0x0F;              // Toutes les broches numeriques
    TRISBbits.TRISB0 = 1;      // RB0 = entree (S3)
    TRISCbits.TRISC2 = 0;      // RC2 = sortie (buzzer)

    buzzer_off();               // Buzzer eteint au demarrage
    init_interrupt();           // Activer INT0

    while (1) {
        if (count >= 7) {
            buzzer_on();        // Sonne a 500 Hz tant que count >= 7
        } else {
            buzzer_off();       // Buzzer arrete
        }
    }
}"""),
    note("Pourquoi 'volatile int count' ?\n"
         "Une variable modifiée dans une ISR ET dans main() doit être volatile.\n"
         "Sans ça, le compilateur peut optimiser en mettant count en cache →\n"
         "il ne voit jamais la mise à jour faite par l'ISR."),
    PageBreak(),
]

# ══════════════════════════════════════════════════════════════
# EX 3
# ══════════════════════════════════════════════════════════════
story += [
    section("Exercice 3 — Polling vs Interrupt (Scrutation vs Interruption)"),
    body("<b>Objectif :</b> comparer deux méthodes pour déclencher le buzzer :<br/>"
         "• <b>Scrutation (Polling)</b> : lire en permanence RA4 dans la boucle while<br/>"
         "• <b>Interruption</b> : INT0 sur RB0 déclenche l'ISR automatiquement"),
    SP(4),
    subsec("Code complet — Ex3_Polling_vs_Interrupt.c"),
    code("""\
#include <xc.h>
#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

#define BUZZER  LATCbits.LATC2
#define BTN_RA4 PORTAbits.RA4   // Bouton en scrutation sur RA4
#define BTN_RB0 PORTBbits.RB0   // Bouton via interruption sur RB0

void buzzer_on(void) {
    BUZZER = 1; __delay_ms(1);
    BUZZER = 0; __delay_ms(1);
}
void buzzer_off(void) { BUZZER = 0; }

/* ISR : declenchee par RB0 -> reponse immediate */
void __interrupt() ISR(void) {
    INTCON2bits.INT0ED = 0;
    INTCONbits.INT0IF = 0;   // Effacer le flag (obligatoire)
    buzzer_on();
}

void init_port(void) {
    OSCCON = 0x72;
    ADCON1 = 0x0F;
    TRISAbits.TRISA4 = 1;      // RA4 = entree (scrutation)
    TRISBbits.TRISB0 = 1;      // RB0 = entree (interruption)
    TRISCbits.TRISC2 = 0;      // RC2 = sortie (buzzer)
    buzzer_off();
    /* Configuration interruption INT0 */
    INTCON2bits.INT0ED = 0;    // Front descendant
    INTCONbits.INT0IF = 0;     // Effacer le flag au depart
    INTCONbits.INT0IE = 1;     // Activer INT0
    INTCONbits.PEIE   = 1;
    INTCONbits.GIE    = 1;
}

void main(void) {
    init_port();

    while (1) {
        /* --- Scrutation (Polling) sur RA4 --- */
        if (BTN_RA4 == 0) {     // Bouton appuye ?
            buzzer_on();
        } else {
            buzzer_off();
        }
        /* L'ISR sur RB0 peut s'intercaler a tout moment -> reponse immediate */
    }
}"""),
    SP(4),
    subsec("Tableau de comparaison Polling vs Interruption"),
]

# Comparison table
tdata = [
    ["Critère", "Scrutation (RA4)", "Interruption (RB0)"],
    ["Réactivité", "Dépend de la boucle", "Immédiate"],
    ["Peut rater un appui court ?", "Oui (si dans delay_ms)", "Non — jamais"],
    ["Charge CPU", "Élevée (boucle continue)", "Faible"],
    ["Complexité du code", "Simple", "Légèrement plus complexe"],
]
t = Table(tdata, colWidths=[5*cm, 6.5*cm, 6.5*cm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), MED_BLUE),
    ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
    ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE",   (0, 0), (-1, -1), 8.5),
    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f4f5fa")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef0f8")]),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#aaaacc")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(SP(4))
story.append(t)

story += [
    SP(6),
    note("CONCLUSION Ex3 :\n"
         "Si le programme exécute __delay_ms(1) au moment où on appuie sur RA4,\n"
         "l'appui est RATÉ (le programme ne lit pas RA4 pendant ce temps).\n"
         "Avec RB0 + interruption, le hardware détecte l'appui INSTANTANÉMENT\n"
         "et l'ISR s'exécute dès la fin de l'instruction en cours."),
    PageBreak(),
]

# ══════════════════════════════════════════════════════════════
# RÉCAP
# ══════════════════════════════════════════════════════════════
story += [
    section("Récapitulatif — Points clés à retenir"),
    SP(4),
    body("<b>1.</b>  ADCON1 = 0x0F  → Toujours mettre en mode NUMÉRIQUE !"),
    body("<b>2.</b>  Dans l'ISR : effacer le FLAG d'interruption EN PREMIER (sinon boucle infinie)."),
    body("<b>3.</b>  Toute variable partagée entre l'ISR et main() doit être déclarée <b>volatile</b>."),
    body("<b>4.</b>  Ordre d'activation des interruptions : INT0ED → GIE → PEIE → INT0IE → effacer INT0IF."),
    body("<b>5.</b>  L'interruption est plus fiable que le polling pour les événements rapides ou courts."),
    SP(6),
    subsec("Schéma de connexion"),
    code("""\
PIC18F4525
   RB0 ---[R 10k vers VCC]---[Bouton S3 / S2]--- GND   (INT0 ou polling)
   RA4 ---[R 10k vers VCC]---[Bouton polling]---- GND   (Scrutation Ex3)
   RA4 ---[R 470 ohm]-------[LED D2 anode]------- GND   (Ex1)
   RC2 ---[Buzzer piezoelectrique]-----------------GND   (Ex2 et Ex3)

Resistance pull-up : 10 kOhm vers +5V sur chaque bouton
Resistance LED    : 470 Ohm en serie avec la LED"""),
]

doc.build(story)
print("PDF généré : TP_Lab2_Solutions.pdf")
