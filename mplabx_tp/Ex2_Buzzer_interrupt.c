// =====================================================================
// Ex 2 - External Interrupt (INT0) - Buzzer - PIC18F4525
// =====================================================================
// Circuit (Fig 1.13 / 1.14) :
//   - Bouton S3 (PB) sur RB0 / INT0
//   - Buzzer piézoélectrique sur RC2
//
// Logique :
//   - count commence à 26
//   - Chaque appui sur S3 → interruption INT0 → count--
//   - Si count >= 7  → le buzzer sonne (boucle while dans main)
//   - Après 3 appuis (26 → 23 → 20 → 17 … jusqu'à < 7) → buzzer s'arrête
//
// Note du TP : il faut 3 appuis pour passer de count=26 à count < 7 ?
//   Non : 26, puis chaque ISR fait count--. Après environ 19 appuis,
//   count < 7. Le TP précise « si vous appuyez 3 fois sur S3, count
//   descend à 7 et le buzzer s'arrête » → cela suppose un décrément de
//   plus grande valeur par appui, ici on décrémente de 7 par appui pour
//   correspondre à l'énoncé : 26 → 19 → 12 → 5 (< 7 → arrêt).
// =====================================================================

#include <xc.h>

#pragma config FOSC  = INTIO67
#pragma config WDT   = OFF
#pragma config LVP   = OFF
#pragma config PBADEN = OFF

#define _XTAL_FREQ 8000000

// ---- Brochage ----
#define BUZZER  LATCbits.LATC2  // Buzzer sur RC2
#define S3      PORTBbits.RB0   // Bouton S3 sur RB0 (INT0)

// Variable globale partagée entre main() et l'ISR
volatile int count = 26;

// =========================================================
// MODULE 1 : buzzer_on()
// =========================================================
// EXPLICATION :
//   Un buzzer actif à 500 Hz → période = 1/500 = 2 ms
//   Signal carré : 1 ms à l'état HAUT + 1 ms à l'état BAS
//   On fait une seule période ici (une oscillation).
//   Pour sonner longtemps, on appelle buzzer_on() en boucle.
// =========================================================
void buzzer_on(void) {
    BUZZER = 1;          // RC2 = 1 → signal HAUT pendant 1 ms
    __delay_ms(1);
    BUZZER = 0;          // RC2 = 0 → signal BAS pendant 1 ms
    __delay_ms(1);
    // → 1 période complète = 2 ms = fréquence 500 Hz
}

// =========================================================
// MODULE 2 : buzzer_off()
// =========================================================
// Force la sortie RC2 à 0 pour couper le buzzer immédiatement.
// =========================================================
void buzzer_off(void) {
    BUZZER = 0;
}

// =========================================================
// MODULE 3 : init_interrupt()
// =========================================================
// EXPLICATION étape par étape :
//
//  a) INTCON2bits.INT0ED = 0
//     → Détection sur front DESCENDANT (falling edge)
//       (0 = front descendant, 1 = front montant)
//       Quand on appuie sur le bouton, la broche passe de 1 à 0
//       → c'est un front descendant.
//
//  b) INTCONbits.GIE = 1
//     → Active les interruptions globales (Global Interrupt Enable)
//       Sans ça, AUCUNE interruption ne peut se déclencher.
//
//  c) INTCONbits.PEIE = 1
//     → Active les interruptions périphériques (Peripheral Interrupt Enable)
//       Nécessaire pour les interruptions matérielles sur certains PICs.
//
//  d) INTCONbits.INT0IE = 1
//     → Active spécifiquement l'interruption INT0
//       (INT0 Interrupt Enable)
//
//  e) INTCONbits.INT0IF = 0
//     → Efface le flag d'interruption INT0 (INT0 Interrupt Flag)
//       TOUJOURS effacer le flag avant d'activer les interruptions,
//       sinon une interruption parasite peut se déclencher au démarrage.
// =========================================================
void init_interrupt(void) {
    INTCON2bits.INT0ED = 0;  // (a) Front descendant sur INT0
    INTCONbits.GIE    = 1;  // (b) Activer interruptions globales
    INTCONbits.PEIE   = 1;  // (c) Activer interruptions périphériques
    INTCONbits.INT0IE = 1;  // (d) Activer INT0
    INTCONbits.INT0IF = 0;  // (e) Effacer flag INT0 (propre au départ)
}

// =========================================================
// MODULE 4 : ISR - Routine de Service d'Interruption
// =========================================================
// EXPLICATION :
//   void __interrupt() ISR(void) est la syntaxe XC8 pour déclarer
//   la fonction d'interruption (vecteur haute priorité).
//
//   RÈGLE ABSOLUE : Toujours effacer le flag d'interruption INT0IF
//   EN PREMIER dans l'ISR. Si on ne l'efface pas, le PIC va croire
//   qu'une nouvelle interruption vient d'arriver et rappellera l'ISR
//   en boucle infinie !
//
//   Ensuite on décrémente count (de 7 pour correspondre à l'énoncé :
//   3 appuis suffisent pour passer count sous le seuil 7).
// =========================================================
void __interrupt() ISR(void) {
    // !! OBLIGATOIRE !! Effacer le flag AVANT de sortir
    INTCONbits.INT0IF = 0;

    // Décrémenter le compteur
    count -= 7;
    // Après 3 appuis : 26 → 19 → 12 → 5  (5 < 7 → buzzer s'arrête)
}

// =========================================================
// MODULE 5 : main()
// =========================================================
// EXPLICATION :
//  1. OSCCON = 0x72 → oscillateur interne 8 MHz
//  2. ADCON1 = 0x0F → toutes les broches en mode numérique
//  3. TRISBbits.TRISB0 = 1 → RB0 en ENTRÉE (pour lire S3)
//  4. TRISCbits.TRISC2 = 0 → RC2 en SORTIE (pour piloter le buzzer)
//  5. init_interrupt() → configure et active les interruptions
//  6. La boucle while(1) appelle buzzer_on() si count >= 7,
//     sinon buzzer_off() pour s'assurer que le buzzer est éteint.
//     buzzer_on() est appelé en boucle pour produire un son continu
//     (chaque appel = 1 période = 2 ms, soit 500 Hz).
// =========================================================
void main(void) {
    // --- Initialisation ---
    OSCCON = 0x72;              // Oscillateur interne 8 MHz
    ADCON1 = 0x0F;              // Toutes les broches : numérique

    TRISBbits.TRISB0 = 1;      // RB0 = entrée (S3)
    TRISCbits.TRISC2 = 0;      // RC2 = sortie (Buzzer)

    buzzer_off();               // Buzzer éteint au départ
    init_interrupt();           // Activer l'interruption INT0

    // --- Boucle principale ---
    while (1) {
        if (count >= 7) {
            buzzer_on();        // Produit 1 période à 500 Hz
            // L'ISR peut interrompre ici à tout moment pour décrémenter count
        } else {
            buzzer_off();       // count < 7 → on éteint le buzzer
        }
    }
}
