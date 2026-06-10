// =====================================================================
// Ex 1 - Timer Switch (Minuterie) - PIC18F4525
// =====================================================================
// Circuit : Bouton S2 sur RB0, LED D2 sur RA4
//
// Comportement :
//   - Appuyer S2 → LED D2 s'allume
//   - Tant que S2 est appuyé → LED clignote toutes les secondes
//   - Quand on lâche S2 → LED reste allumée 5 secondes puis s'éteint
// =====================================================================

#include <xc.h>

// ---- Bits de configuration du PIC18F4525 ----
#pragma config FOSC  = INTIO67   // Oscillateur interne, RA6/RA7 = E/S
#pragma config WDT   = OFF       // Watchdog Timer désactivé
#pragma config LVP   = OFF       // Pas de prog. basse tension
#pragma config PBADEN = OFF      // PORTB = numérique au démarrage

#define _XTAL_FREQ 8000000       // 8 MHz (pour __delay_ms)

// --- Macros pratiques ---
#define S2        PORTBbits.RB0  // Bouton S2 sur RB0 (1 = pas appuyé, 0 = appuyé)
#define LED_D2    LATAbits.LATA4 // LED D2 sur RA4

// =========================================================
// EXPLICATION : delay_1s() avec le Timer 1
// =========================================================
// Oscillateur = 8 MHz → chaque cycle instruction = 0.5 µs
// Timer 1 prescaler 1:8  → chaque tick = 4 µs
// Valeur initiale pour débordement à 65536 : 65536 - 250000 = 15536
//   250 000 ticks × 4 µs = 1 000 000 µs = 1 seconde ✓
// On charge TMR1H:TMR1L = 0x3CB0 (15536 en décimal)
// On attend que le flag TMR1IF passe à 1 (débordement)
// =========================================================
void delay_1s(void) {
    T1CON = 0x31;           // Timer1 ON, prescaler 1:8, horloge interne
    TMR1H = 0x3C;           // Octet haut : 0x3C
    TMR1L = 0xB0;           // Octet bas  : 0xB0  → total = 0x3CB0 = 15536
    PIR1bits.TMR1IF = 0;    // Effacer le flag de débordement
    while (!PIR1bits.TMR1IF); // Attendre le débordement (= 1 seconde)
    T1CONbits.TMR1ON = 0;   // Arrêter le timer
}

// =========================================================
// EXPLICATION : init_port()
// =========================================================
// OSCCON = 0x72 → bits IRCF = 111 → oscillateur interne 8 MHz
// ADCON1 = 0x0F → toutes les broches en mode NUMÉRIQUE (pas analogique)
//   (important car par défaut plusieurs broches sont analogiques)
// TRISB  = 0xFF → tout le PORTB en ENTRÉE (pour lire S2 sur RB0)
// TRISA  = 0x00 → tout le PORTA en SORTIE (pour piloter LED sur RA4)
// =========================================================
void init_port(void) {
    OSCCON = 0x72;   // Oscillateur interne 8 MHz
    ADCON1 = 0x0F;   // Toutes les broches : mode numérique
    TRISB  = 0xFF;   // PORTB en entrée (S2 sur RB0)
    TRISA  = 0x00;   // PORTA en sortie (LED D2 sur RA4)
    LED_D2 = 0;      // LED éteinte au démarrage
}

// =========================================================
// PROGRAMME PRINCIPAL
// =========================================================
void main(void) {
    int count = 0;

    init_port();

    while (1) {
        count = 0;

        // ---------- Étape 1 : attendre l'appui sur S2 ----------
        // S2 est actif bas : 0 = appuyé, 1 = relâché
        while (S2 == 1);   // Attendre que S2 soit pressé

        // ---------- Étape 2 : allumer la LED ----------
        LED_D2 = 1;

        // ---------- Étape 3 : boucle de minuterie ----------
        // Tant que S2 est appuyé : la LED clignote (on/off chaque seconde)
        // Quand S2 est relâché   : on compte 5 secondes supplémentaires
        while (1) {
            delay_1s();

            if (S2 == 0) {
                // S2 encore appuyé : clignoter
                LED_D2 = !LED_D2;
            } else {
                // S2 relâché : compter les secondes restantes
                count++;
                if (count >= 5) break;  // 5 secondes écoulées → sortir
            }
        }

        // ---------- Étape 4 : éteindre la LED ----------
        LED_D2 = 0;
    }
}
