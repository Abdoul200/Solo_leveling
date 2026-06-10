# Lab 2 - External Events : Réponses et Explications

---

## Ex 1 : Timer Switch (Minuterie)

### Ce qu'on fait
- Bouton **S2** sur **RB0**, LED **D2** sur **RA4**
- Appuyer S2 → LED s'allume
- S2 maintenu → LED clignote chaque seconde
- S2 relâché → LED reste allumée **5 secondes** puis s'éteint

### Comment configurer les ports
```c
OSCCON = 0x72;   // Oscillateur interne 8 MHz (bits IRCF = 111)
ADCON1 = 0x0F;   // Toutes les broches en mode NUMÉRIQUE
TRISB  = 0xFF;   // PORTB en ENTRÉE (pour lire S2 sur RB0)
TRISA  = 0x00;   // PORTA en SORTIE (pour piloter LED RA4)
```

### Comment faire 1 seconde avec le Timer 1
```
Fosc = 8 MHz → cycle instruction = 0.5 µs
Timer1 prescaler 1:8 → 1 tick = 4 µs
Valeur de départ : 65536 - 250000 = 15536 = 0x3CB0
250 000 ticks × 4 µs = 1 000 000 µs = 1 seconde ✓
```
```c
T1CON = 0x31;           // Timer1 ON, prescaler 1:8, horloge interne
TMR1H = 0x3C;           // 0x3CB0 = 15536
TMR1L = 0xB0;
PIR1bits.TMR1IF = 0;    // Effacer le flag
while (!PIR1bits.TMR1IF); // Attendre 1 seconde
```

---

## Ex 2 : External Interrupt (INT0) + Buzzer

### Partie 1 — buzzer_on() et buzzer_off()

**500 Hz → période = 2 ms → 1 ms HIGH + 1 ms LOW**

```c
void buzzer_on(void) {
    BUZZER = 1;       // RC2 = 1 pendant 1 ms
    __delay_ms(1);
    BUZZER = 0;       // RC2 = 0 pendant 1 ms
    __delay_ms(1);
}

void buzzer_off(void) {
    BUZZER = 0;       // Forcer RC2 à 0
}
```

### Partie 2 — Pourquoi le compteur saute à 29

Quand on connecte le buzzer, le signal carré sur RC2 crée des **transitions** rapides 0→1 et 1→0. Ces transitions peuvent être vues sur d'autres broches comme des parasites, ce qui peut déclencher de faux comptages. C'est pour ça qu'il faut configurer **ADCON1 = 0x0F** pour mettre toutes les entrées en mode numérique.

### Partie 3 — init_interrupt()

```c
void init_interrupt(void) {
    INTCON2bits.INT0ED = 0;  // (a) Front DESCENDANT (bouton appuyé = 1→0)
    INTCONbits.GIE    = 1;  // (b) Activer interruptions GLOBALES
    INTCONbits.PEIE   = 1;  // (c) Activer interruptions PÉRIPHÉRIQUES
    INTCONbits.INT0IE = 1;  // (d) Activer INT0 spécifiquement
    INTCONbits.INT0IF = 0;  // (e) Effacer le flag (propre au départ)
}
```

| Bit | Registre | Rôle |
|-----|----------|------|
| INT0ED | INTCON2 | 0 = front descendant, 1 = front montant |
| GIE | INTCON | Active TOUTES les interruptions |
| PEIE | INTCON | Active les interruptions périphériques |
| INT0IE | INTCON | Active l'interruption INT0 |
| INT0IF | INTCON | Flag : mis à 1 quand INT0 se déclenche |

### Partie 4 — ISR (Routine de Service d'Interruption)

```c
void __interrupt() ISR(void) {
    INTCONbits.INT0IF = 0;  // !! TOUJOURS effacer le flag EN PREMIER !!
    count--;                 // Décrémenter le compteur
}
```

**RÈGLE ABSOLUE** : Si on oublie d'effacer `INT0IF`, le PIC croit qu'une nouvelle interruption est arrivée → il rappelle l'ISR en boucle infinie → le programme se bloque.

### Partie 5 — main()

```c
void main(void) {
    OSCCON = 0x72;              // 8 MHz
    ADCON1 = 0x0F;              // Numérique
    TRISBbits.TRISB0 = 1;      // RB0 = entrée (S3)
    TRISCbits.TRISC2 = 0;      // RC2 = sortie (buzzer)

    count = 26;                 // Valeur initiale
    buzzer_off();
    init_interrupt();

    while (1) {
        if (count >= 7) {
            buzzer_on();        // Sonner à 500 Hz
        } else {
            buzzer_off();       // S'arrêter
        }
    }
}
```

**Pourquoi count = 26 ?** Le TP dit que le compteur saute à 26 quand le buzzer est connecté. On part donc de 26 pour simuler la condition réelle.

**Pourquoi count >= 7 ?** Après 3 appuis sur S3, count descend en dessous de 7 → buzzer s'arrête.

---

## Ex 3 : Polling vs Interrupt

### Nouveau projet : Buzzer_switch

Copier le `Buzzer.c` de l'ex 2, puis :

1. Configurer **RA4** en **entrée** (`TRISAbits.TRISA4 = 1`)
2. Modifier la boucle `while(1)` pour lire RA4 par scrutation
3. Ajouter l'ISR pour INT0 sur RB0

### Code complet

```c
// Boucle principale = SCRUTATION sur RA4
while (1) {
    if (PORTAbits.RA4 == 0) {  // Bouton appuyé
        buzzer_on();
    } else {
        buzzer_off();
    }
}

// ISR = INTERRUPTION sur RB0
void __interrupt() ISR(void) {
    INTCON2bits.INT0ED = 0;
    INTCONbits.INT0IF = 0;   // Effacer le flag
    buzzer_on();
}
```

### Pourquoi l'interruption est meilleure que la scrutation

| Critère | Scrutation (RA4) | Interruption (RB0) |
|---------|------------------|-------------------|
| Réactivité | Dépend de la boucle | Immédiate |
| Risque de rater un appui court | Oui | Non |
| Charge CPU | Élevée (boucle continue) | Faible (seulement quand nécessaire) |
| Complexité du code | Simple | Légèrement plus complexe |

**Conclusion** : L'interruption est **plus fiable et plus efficace** car le matériel détecte l'événement instantanément, même si le processeur est occupé ailleurs. La scrutation peut **rater** un appui très bref si le programme est dans un `__delay_ms()` au moment de l'appui.

---

## Schéma de connexion résumé

```
PIC18F4525
├── RB0 ──── Bouton S3 (INT0) ──── GND
├── RA4 ──── Bouton polling ──────  GND
├── RA4 ──── LED D2 ──── R ──── VCC   (Ex 1)
└── RC2 ──── Buzzer piézoélectrique
```

> Résistance de tirage (pull-up) sur les boutons : R = 10 kΩ vers +5V
