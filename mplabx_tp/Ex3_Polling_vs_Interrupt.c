// =====================================================================
// Ex 3 - Polling vs Interrupt - PIC18F4525
// =====================================================================
// Projet : Buzzer_switch
//
// Objectif : comparer DEUX méthodes pour déclencher le buzzer :
//   - Scrutation (polling) : lire en permanence l'état de RA4
//   - Interruption        : INT0 sur RB0 déclenche l'ISR automatiquement
//
// Circuit :
//   - RA4 → bouton en scrutation (polling)
//   - RB0 → bouton S3 via interruption INT0
//   - RC2 → Buzzer
// =====================================================================

#include <xc.h>

#pragma config FOSC  = INTIO67
#pragma config WDT   = OFF
#pragma config LVP   = OFF
#pragma config PBADEN = OFF

#define _XTAL_FREQ 8000000

#define BUZZER  LATCbits.LATC2
#define BTN_RA4 PORTAbits.RA4   // Bouton en scrutation sur RA4
#define BTN_RB0 PORTBbits.RB0   // Bouton S3 via interruption sur RB0

// =========================================================
// buzzer_on / buzzer_off (identiques à l'exercice 2)
// =========================================================
void buzzer_on(void) {
    BUZZER = 1;
    __delay_ms(1);
    BUZZER = 0;
    __delay_ms(1);
}

void buzzer_off(void) {
    BUZZER = 0;
}

// =========================================================
// ISR - Routine d'interruption pour RB0 / INT0
// =========================================================
// EXPLICATION :
//   INTCON2bits.INT0ED = 0  → on détecte le front DESCENDANT
//   INT0IF = 0              → TOUJOURS effacer le flag en premier
//   buzzer_on()             → le buzzer joue UNE période dans l'ISR
//
//   Différence clé avec le polling :
//   Avec l'interruption, le PIC ARRÊTE ce qu'il fait et exécute l'ISR
//   immédiatement → réponse instantanée, même si le programme est
//   occupé à faire autre chose.
//   Avec le polling, le programme doit arriver au test if(RA4==0)
//   pour réagir → il peut rater un appui court ou réagir avec du retard.
// =========================================================
void __interrupt() ISR(void) {
    INTCON2bits.INT0ED = 0;  // Confirmer front descendant
    INTCONbits.INT0IF = 0;   // !! OBLIGATOIRE : effacer le flag
    buzzer_on();             // Le buzzer sonne une période
}

// =========================================================
// init_port() - Configuration des broches et interruptions
// =========================================================
void init_port(void) {
    OSCCON = 0x72;              // Oscillateur interne 8 MHz
    ADCON1 = 0x0F;              // Toutes les broches : numérique

    TRISAbits.TRISA4 = 1;      // RA4 en ENTRÉE (scrutation)
    TRISBbits.TRISB0 = 1;      // RB0 en ENTRÉE (interruption INT0)
    TRISCbits.TRISC2 = 0;      // RC2 en SORTIE (buzzer)

    buzzer_off();

    // --- Configuration de l'interruption INT0 ---
    INTCON2bits.INT0ED = 0;    // Front descendant
    INTCONbits.INT0IF = 0;     // Effacer le flag au départ
    INTCONbits.INT0IE = 1;     // Activer INT0
    INTCONbits.PEIE   = 1;     // Activer interruptions périphériques
    INTCONbits.GIE    = 1;     // Activer interruptions globales
}

// =========================================================
// main() - Boucle principale avec SCRUTATION sur RA4
// =========================================================
// EXPLICATION :
//   La boucle while(1) surveille RA4 par scrutation (polling).
//   Dès que RA4 passe à 0 (bouton appuyé), on fait sonner le buzzer.
//
//   PENDANT CE TEMPS, si on appuie sur RB0, l'ISR se déclenche
//   AUTOMATIQUEMENT et interrompt la boucle → le buzzer sonne aussi.
//
//   Observation attendue :
//   - Avec RA4 (polling) : si l'appui est très court ET que le
//     programme est dans __delay_ms(1), l'appui peut être RATÉ.
//   - Avec RB0 (interruption) : l'appui est TOUJOURS détecté,
//     même s'il est très bref, car le matériel déclenche l'ISR.
//   → L'interruption est PLUS FIABLE pour les événements rapides.
// =========================================================
void main(void) {
    init_port();

    while (1) {
        // --- Scrutation (Polling) sur RA4 ---
        if (BTN_RA4 == 0) {     // Bouton appuyé (actif bas)
            buzzer_on();        // Faire sonner le buzzer
        } else {
            buzzer_off();
        }
        // L'ISR sur RB0 peut interrompre à tout moment → réponse immédiate
    }
}
