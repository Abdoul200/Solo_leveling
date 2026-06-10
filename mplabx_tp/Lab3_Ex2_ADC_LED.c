// =====================================================================
// Lab 3 - Ex 2 : ADC LED - PIC18F4525
// =====================================================================
// Circuit :
//   - Potentiomètre sur RA0 (AN0)
//   - 4 LEDs sur RB0, RB1, RB2, RB3 (PORTB)
//
// Principe :
//   L'ADC est 10 bits → valeur de 0 à 1023.
//   On divise la plage en 4 zones et on allume les LEDs progressivement :
//   - 0   à 255  → 1 LED allumée  (~0 à 1.25 V)
//   - 256 à 511  → 2 LEDs allumées (~1.25 à 2.5 V)
//   - 512 à 767  → 3 LEDs allumées (~2.5 à 3.75 V)
//   - 768 à 1023 → 4 LEDs allumées (~3.75 à 5 V)
// =====================================================================

#include <xc.h>

#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

// =========================================================
// init_ADC() - identique à Ex 1
// =========================================================
void init_ADC(void) {
    ADCON1 = 0x0E;           // AN0 seul en analogique
    ADCON0 = 0x01;           // Canal AN0, ADC ON
    ADCON2 = 0b10110111;     // Résultat à droite, 16TAD, FRC
}

// =========================================================
// conversion() - identique à Ex 1
// =========================================================
unsigned int conversion(void) {
    ADCON0bits.GO_nDONE = 1;
    while (ADCON0bits.GO_nDONE);
    return ((unsigned int)ADRESH << 8) | ADRESL;
}

// =========================================================
// VARIABLE GLOBALE
// =========================================================
unsigned int val;   // Résultat ADC : 0 à 1023

// =========================================================
// main()
// =========================================================
// Explication du mapping ADC → LEDs :
//
//   ADC 10 bits : 0 à 1023 → divisé en 4 quarts de 256
//   Chaque quart allume une LED de plus (comme une jauge de niveau)
//
//   LATB = 0b00000001 → seul RB0 à 1 → 1 LED allumée
//   LATB = 0b00000011 → RB0 et RB1 à 1 → 2 LEDs allumées
//   LATB = 0b00000111 → RB0, RB1, RB2 → 3 LEDs allumées
//   LATB = 0b00001111 → RB0 à RB3 → 4 LEDs allumées
// =========================================================
void main(void) {
    OSCCON = 0x72;             // Oscillateur interne 8 MHz
    ADCON1 = 0x0E;             // AN0 analogique (avant init_ADC)
    TRISB  = 0x00;             // PORTB en SORTIE (LEDs sur RB0-RB3)
    TRISAbits.TRISA0 = 1;     // RA0 en entrée (potentiomètre AN0)
    LATB   = 0x00;             // Toutes les LEDs éteintes au départ

    init_ADC();                // Initialiser le module ADC

    while (1) {
        val = conversion();    // Lire la valeur ADC (0 à 1023)

        // Mapping de la valeur ADC sur 4 LEDs (affichage en jauge)
        if (val < 256) {
            LATB = 0b00000001; // 1 LED allumée  (0V à ~1.25V)
        } else if (val < 512) {
            LATB = 0b00000011; // 2 LEDs allumées (~1.25V à ~2.5V)
        } else if (val < 768) {
            LATB = 0b00000111; // 3 LEDs allumées (~2.5V à ~3.75V)
        } else {
            LATB = 0b00001111; // 4 LEDs allumées (~3.75V à 5V)
        }
        // Tourner le potentiomètre → les LEDs s'allument progressivement
    }
}
