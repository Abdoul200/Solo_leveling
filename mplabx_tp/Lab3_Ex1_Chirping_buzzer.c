// =====================================================================
// Lab 3 - Ex 1 : Chirping Buzzer (ADC + Buzzer) - PIC18F4525
// =====================================================================
// Circuit :
//   - Potentiomètre sur RA0 (AN0)
//   - Buzzer piézoélectrique sur RC2
//
// Principe :
//   L'ADC lit la position du potentiomètre (0-1023).
//   Cette valeur est utilisée comme délai dans buzzer_on() :
//   - Petite valeur → délai court → fréquence haute → son aigu
//   - Grande valeur → délai long  → fréquence basse → son grave
//   En tournant le potentiomètre on fait varier la fréquence → effet "chirping"
// =====================================================================

#include <xc.h>
#include <stdio.h>

#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

// =========================================================
// MODULE 1 : init_ADC()
// =========================================================
// Explication registre par registre :
//
// ADCON1 = 0x0E (0b00001110) :
//   Bits PCFG3:PCFG0 = 1110 → seul AN0 (RA0) est analogique
//   Le reste des broches reste en mode numérique
//
// ADCON0 = 0x01 (0b00000001) :
//   CHS3:CHS0 = 0000 → Canal 0 (AN0 = RA0) sélectionné
//   ADON = 1         → Module ADC activé
//   (ADGO = 0        → pas de conversion en cours)
//
// ADCON2 = 0b10110111 :
//   bit 7  ADFM  = 1   → résultat justifié à DROITE (valeur 0-1023 dans ADRESH:ADRESL)
//   bit 6        = 0   → non utilisé
//   bits 5:3 ACQT= 110 → temps d'acquisition = 16 TAD
//   bits 2:0 ADCS= 111 → horloge de conversion = FRC (oscillateur RC dédié)
// =========================================================
void init_ADC(void) {
    ADCON1 = 0x0E;           // AN0 seul en analogique, reste = numérique
    ADCON0 = 0x01;           // Canal AN0, module ADC ON
    ADCON2 = 0b10110111;     // Résultat à droite, 16TAD, horloge FRC
}

// =========================================================
// MODULE 2 : conversion()
// =========================================================
// Retourne la valeur numérique sur 10 bits (0 à 1023).
//
// ADCON0bits.GO_nDONE = 1 → déclenche la conversion
// Le bit revient à 0 automatiquement quand la conversion est finie
// Résultat = ADRESH (2 bits hauts) + ADRESL (8 bits bas) = 10 bits
// =========================================================
unsigned int conversion(void) {
    ADCON0bits.GO_nDONE = 1;          // Démarrer la conversion
    while (ADCON0bits.GO_nDONE);      // Attendre la fin (bit repassé à 0)
    return ((unsigned int)ADRESH << 8) | ADRESL; // Valeur 10 bits
}

// =========================================================
// MODULE 3 : buzzer_on(int delay)
// =========================================================
// IMPORTANT : On NE peut pas utiliser __delay_ms(variable) car cette
// fonction requiert une CONSTANTE connue à la compilation.
// On utilise à la place une boucle for avec le paramètre delay.
//
// Plus delay est grand → boucle plus longue → période plus longue → son grave
// Plus delay est petit → boucle plus courte → période plus courte → son aigu
// =========================================================
void buzzer_on(int delay) {
    int i;
    LATCbits.LATC2 = 1;                // RC2 = 1 (buzzer ON)
    for (i = 0; i < delay; i++);       // Attendre 'delay' itérations
    LATCbits.LATC2 = 0;                // RC2 = 0 (buzzer OFF)
    for (i = 0; i < delay; i++);       // Attendre 'delay' itérations
    // → 1 période complète de durée proportionnelle à 'delay'
}

// =========================================================
// VARIABLE GLOBALE
// =========================================================
// IMPORTANT : déclarer en 'unsigned int' (pas int !)
// car l'ADC donne une valeur entre 0 et 1023.
// Avec 'int' (signé), les valeurs > 32767 seraient négatives
// (ici pas de risque, mais c'est la convention du TP).
// =========================================================
unsigned int val;

// =========================================================
// main()
// =========================================================
void main(void) {
    OSCCON = 0x72;              // Oscillateur interne 8 MHz
    TRISAbits.TRISA0 = 1;      // RA0 = entrée analogique (potentiomètre)
    TRISCbits.TRISC2 = 0;      // RC2 = sortie (buzzer)
    LATCbits.LATC2 = 0;        // Buzzer éteint au départ

    init_ADC();                 // Initialiser le module ADC

    while (1) {
        val = conversion();     // Lire la valeur du potentiomètre (0-1023)
        buzzer_on(val);         // Produire le son avec cette fréquence
        // → tourner le potentiomètre change la fréquence du son
    }
}
