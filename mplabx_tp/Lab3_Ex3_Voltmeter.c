// =====================================================================
// Lab 3 - Ex 3 : Voltmètre avec afficheur LCD - PIC18F4525
// =====================================================================
// Circuit :
//   - Potentiomètre sur RA0 (AN0)
//   - Afficheur LCD (données sur PORTD, contrôle sur PORTE)
//
// Avant de compiler :
//   1. Télécharger LCD_Library.c et LCD_header.h depuis Moodle
//   2. Copier-coller les fichiers dans le dossier du projet
//   3. Dans MPLAB X : clic droit sur "Source Files" → Add Existing Item
//      → sélectionner LCD_Library.c
//   4. Dans les includes : ajouter LCD_Library.h (Add Existing Item)
//   5. Mettre #include "LCD_Library.h" dans ce fichier
//
// Principe :
//   Valeur ADC (0-1023) → convertie en tension (0.00 à 5.00 V)
//   Formule : V = ADC_val × 5.0 / 1023.0
//   Affichage sur la ligne 2 du LCD : "Vol: X.XX V"
// =====================================================================

#include <xc.h>
#include <stdio.h>          // Pour sprintf()
#include "LCD_Library.h"    // Bibliothèque LCD (à télécharger sur Moodle)

#pragma config FOSC = INTIO67, WDT = OFF, LVP = OFF, PBADEN = OFF
#define _XTAL_FREQ 8000000

// =========================================================
// init_ADC() - identique aux exercices précédents
// =========================================================
void init_ADC(void) {
    ADCON1 = 0x0E;           // AN0 seul en analogique
    ADCON0 = 0x01;           // Canal AN0, ADC ON
    ADCON2 = 0b10110111;     // Résultat à droite, 16TAD, FRC
}

// =========================================================
// conversion() - identique aux exercices précédents
// =========================================================
unsigned int conversion(void) {
    ADCON0bits.GO_nDONE = 1;
    while (ADCON0bits.GO_nDONE);
    return ((unsigned int)ADRESH << 8) | ADRESL;
}

// =========================================================
// VARIABLE GLOBALE
// =========================================================
unsigned int val;   // Valeur brute ADC (0 à 1023)

// =========================================================
// main()
// =========================================================
// Explication de la formule de conversion :
//
//   ADC est 10 bits → plage : 0 à 1023
//   VDD = 5V (tension de référence)
//   Tension = val × 5.0 / 1023.0
//
//   Exemple :
//     val = 0    → V = 0.00 V
//     val = 512  → V = 2.50 V
//     val = 1023 → V = 5.00 V
//
// Affichage LCD :
//   Ligne 1 : "PIC18F4525"   (titre fixe)
//   Ligne 2 : "Vol: X.XX V"  (valeur mise à jour en temps réel)
//
// IMPORTANT : déclarer 'v' en float (pas unsigned int !)
// car la tension a des décimales : 2.50 V, 3.75 V...
// =========================================================
void main(void) {
    char buffer[17];          // Tampon pour sprintf (16 chars LCD + '\0')
    float v;                  // Tension calculée (déclarer en float !)

    OSCCON = 0x72;            // Oscillateur interne 8 MHz
    TRISD  = 0x00;            // PORTD en SORTIE (données LCD 8 bits)
    TRISE  = 0x00;            // PORTE en SORTIE (RS, RW, E du LCD)
    TRISAbits.TRISA0 = 1;    // RA0 en entrée (potentiomètre AN0)

    init_ADC();               // Initialiser le module ADC

    // --- Initialisation du LCD ---
    lcd_init();               // Configurer le LCD
    lcd_on();                 // Allumer l'affichage

    // --- Affichage du titre (ligne 1) ---
    goto_line(1);             // Aller à la ligne 1
    print_string("PIC18F4525"); // Afficher le titre (ne change pas)

    // --- Boucle infinie : mise à jour de la tension ---
    while (1) {
        goto_line(2);                           // Positionner le curseur ligne 2
        val = conversion();                     // Lire la valeur ADC (0-1023)
        v = (float)val * 5.0 / 1023.0;         // Convertir en tension (0.00-5.00 V)
        sprintf(buffer, "Vol: %4.2f V  ", v);  // Formater la chaîne (ex: "Vol: 3.25 V")
        print_string(buffer);                   // Afficher sur LCD ligne 2
        // → Tourner le potentiomètre : la tension varie de 0.00 à 5.00 V
    }
}
