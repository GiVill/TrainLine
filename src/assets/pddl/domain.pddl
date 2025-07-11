;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; DOMAIN FERROVIARIO MODIFICATO – PDDL 2.1 (Con fermata e uscita)      ;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(define (domain railway-system)
  (:requirements :typing :negative-preconditions :durative-actions :fluents)

  ;;-----------------------------------------------------------------------
  ;; Types
  (:types train point track switch)

  ;;-----------------------------------------------------------------------
  ;; Predicates
  (:predicates
    (at ?t - train ?p - point)
    (track-clear ?tr - track)
    (switch-open ?s - switch)
    (connects ?from ?to - point ?tr - track)
    (train-moving ?t - train)
    (can-depart ?t - train)
    (has-stopped ?t - train)     ; Indica se il treno ha effettuato la fermata
    (ready-to-exit ?t - train)   ; Indica se il treno è pronto per uscire
    (assigned-to ?t - train ?stop - point))  ; Destinazione assegnata al treno

  ;;-----------------------------------------------------------------------
  ;; Numeric fluents
  (:functions
    (time-arrived ?t - train)
    (travel-time ?from ?to - point))

  ;;-----------------------------------------------------------------------
  ;; Azione per abilitare la partenza ritardata di T1 (5 secondi)
  (:durative-action enable-departure-t1
    :parameters ()
    :duration (= ?duration 5)   ; 5 secondi
    :condition (at start (not (can-depart t1)))
    :effect (at end (can-depart t1)))

  ;;-----------------------------------------------------------------------
  ;; Azione per abilitare la partenza ritardata di T2 (15 secondi)
  (:durative-action enable-departure-t2
    :parameters ()
    :duration (= ?duration 15)  ; 15 secondi dall'inizio
    :condition (at start (not (can-depart t2)))
    :effect (at end (can-depart t2)))

  ;;-----------------------------------------------------------------------
  ;; Azione per la fermata obbligatoria di 5 secondi agli stop
  (:durative-action stop-at-destination
    :parameters (?t - train ?stop - point)
    :duration (= ?duration 5)
    :condition (and
        (at start (at ?t ?stop))
        (at start (assigned-to ?t ?stop))
        (at start (not (has-stopped ?t)))
        (at start (not (train-moving ?t))))
    :effect (and
        (at end (has-stopped ?t))
        (at end (ready-to-exit ?t))))

  ;;-----------------------------------------------------------------------
  ;; Movimenti specifici con controlli switch espliciti

  ;; Da start-1 a switch-1 (switch-1 viene chiuso durante il movimento)
  (:durative-action move-start1-switch1
    :parameters (?t - train)
    :duration (= ?duration 15)
    :condition (and
        (at start (at ?t start-1))
        (at start (track-clear track-start1-switch1))
        (at start (can-depart ?t)))
    :effect (and
        (at start (not (track-clear track-start1-switch1)))
        (at start (not (at ?t start-1)))
        (at start (train-moving ?t))
        (at start (not (switch-open switch-1)))  ; Chiude switch durante movimento
        (at end (track-clear track-start1-switch1))
        (at end (at ?t switch-1))
        (at end (not (train-moving ?t)))))

  ;; Da switch-1 a switch-3 (switch vengono chiusi durante movimento)
  (:durative-action move-switch1-switch3
    :parameters (?t - train)
    :duration (= ?duration 8)
    :condition (and
        (at start (at ?t switch-1))
        (at start (track-clear track-switch1-switch3)))
    :effect (and
        (at start (not (track-clear track-switch1-switch3)))
        (at start (not (at ?t switch-1)))
        (at start (train-moving ?t))
        (at start (not (switch-open switch-1)))  ; Mantiene switch-1 chiuso
        (at start (not (switch-open switch-3)))  ; Chiude switch-3 durante movimento
        (at end (track-clear track-switch1-switch3))
        (at end (at ?t switch-3))
        (at end (not (train-moving ?t)))))

  ;; Da switch-3 a switch-6 (switch vengono chiusi durante movimento)
  (:durative-action move-switch3-switch6
    :parameters (?t - train)
    :duration (= ?duration 20)
    :condition (and
        (at start (at ?t switch-3))
        (at start (track-clear track-switch3-switch6)))
    :effect (and
        (at start (not (track-clear track-switch3-switch6)))
        (at start (not (at ?t switch-3)))
        (at start (train-moving ?t))
        (at start (not (switch-open switch-3)))  ; Mantiene switch-3 chiuso
        (at start (not (switch-open switch-6)))  ; Chiude switch-6 durante movimento
        (at end (track-clear track-switch3-switch6))
        (at end (at ?t switch-6))
        (at end (not (train-moving ?t)))))

  ;; Da switch-6 a switch-21 (switch vengono aperti durante movimento)
  (:durative-action move-switch6-switch21
    :parameters (?t - train)
    :duration (= ?duration 7)
    :condition (and
        (at start (at ?t switch-6))
        (at start (track-clear track-switch6-switch21)))
    :effect (and
        (at start (not (track-clear track-switch6-switch21)))
        (at start (not (at ?t switch-6)))
        (at start (train-moving ?t))
        (at start (switch-open switch-6))    ; Apre switch-6 durante movimento
        (at start (switch-open switch-21))   ; Apre switch-21 durante movimento
        (at end (track-clear track-switch6-switch21))
        (at end (at ?t switch-21))
        (at end (not (train-moving ?t)))))

  ;; Da switch-21 a point-7 (switch-21 mantiene stato aperto)
  (:durative-action move-switch21-point7
    :parameters (?t - train)
    :duration (= ?duration 12)
    :condition (and
        (at start (at ?t switch-21))
        (at start (track-clear track-switch21-point7)))
    :effect (and
        (at start (not (track-clear track-switch21-point7)))
        (at start (not (at ?t switch-21)))
        (at start (train-moving ?t))
        (at start (switch-open switch-21))   ; Mantiene switch-21 aperto
        (at end (track-clear track-switch21-point7))
        (at end (at ?t point-7))
        (at end (not (train-moving ?t)))))

  ;; Da point-7 a switch-25 (nessun vincolo switch)
  (:durative-action move-point7-switch25
    :parameters (?t - train)
    :duration (= ?duration 5)
    :condition (and
        (at start (at ?t point-7))
        (at start (track-clear track-point7-switch25)))
    :effect (and
        (at start (not (track-clear track-point7-switch25)))
        (at start (not (at ?t point-7)))
        (at start (train-moving ?t))
        (at end (track-clear track-point7-switch25))
        (at end (at ?t switch-25))
        (at end (not (train-moving ?t)))))

  ;; Da switch-25 a switch-28 (switch vengono aperti durante movimento)
  (:durative-action move-switch25-switch28
    :parameters (?t - train)
    :duration (= ?duration 11)
    :condition (and
        (at start (at ?t switch-25))
        (at start (track-clear track-switch25-switch28)))
    :effect (and
        (at start (not (track-clear track-switch25-switch28)))
        (at start (not (at ?t switch-25)))
        (at start (train-moving ?t))
        (at start (switch-open switch-25))   ; Apre switch-25 durante movimento
        (at start (switch-open switch-28))   ; Apre switch-28 durante movimento
        (at end (track-clear track-switch25-switch28))
        (at end (at ?t switch-28))
        (at end (not (train-moving ?t)))))

  ;; Da switch-25 a stop-3 (switch-25 viene chiuso durante movimento)
  (:durative-action move-switch25-stop3
    :parameters (?t - train)
    :duration (= ?duration 18)
    :condition (and
        (at start (at ?t switch-25))
        (at start (track-clear track-switch25-stop3)))
    :effect (and
        (at start (not (track-clear track-switch25-stop3)))
        (at start (not (at ?t switch-25)))
        (at start (train-moving ?t))
        (at start (not (switch-open switch-25)))  ; Chiude switch-25 durante movimento
        (at end (track-clear track-switch25-stop3))
        (at end (at ?t stop-3))
        (at end (not (train-moving ?t)))
        (at end (assign (time-arrived ?t) (total-time)))))

  ;; Da switch-28 a stop-1 (nessun vincolo switch) - DESTINAZIONE INTERMEDIA
  (:durative-action move-switch28-stop1
    :parameters (?t - train)
    :duration (= ?duration 16)
    :condition (and
        (at start (at ?t switch-28))
        (at start (track-clear track-switch28-stop1)))
    :effect (and
        (at start (not (track-clear track-switch28-stop1)))
        (at start (not (at ?t switch-28)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch28-stop1))
        (at end (at ?t stop-1))
        (at end (not (train-moving ?t)))
        (at end (assign (time-arrived ?t) (total-time)))))

  ;;-----------------------------------------------------------------------
  ;; Movimenti di ritorno verso l'uscita exit-1

  ;; Da stop-1 a switch-28 (percorso inverso)
  (:durative-action move-stop1-switch28
    :parameters (?t - train)
    :duration (= ?duration 16)
    :condition (and
        (at start (at ?t stop-1))
        (at start (track-clear track-switch28-stop1))
        (at start (ready-to-exit ?t)))
    :effect (and
        (at start (not (track-clear track-switch28-stop1)))
        (at start (not (at ?t stop-1)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch28-stop1))
        (at end (at ?t switch-28))
        (at end (not (train-moving ?t)))))

  ;; Da stop-3 a switch-25 (switch-25 viene chiuso durante movimento)
  (:durative-action move-stop3-switch25
    :parameters (?t - train)
    :duration (= ?duration 18)
    :condition (and
        (at start (at ?t stop-3))
        (at start (track-clear track-switch25-stop3))
        (at start (ready-to-exit ?t)))
    :effect (and
        (at start (not (track-clear track-switch25-stop3)))
        (at start (not (at ?t stop-3)))
        (at start (train-moving ?t))
        (at start (not (switch-open switch-25)))  ; Chiude switch-25 durante movimento
        (at end (track-clear track-switch25-stop3))
        (at end (at ?t switch-25))
        (at end (not (train-moving ?t)))))

  ;; Da switch-28 a switch-25 (switch vengono aperti durante movimento)
  (:durative-action move-switch28-switch25
    :parameters (?t - train)
    :duration (= ?duration 11)
    :condition (and
        (at start (at ?t switch-28))
        (at start (track-clear track-switch25-switch28)))
    :effect (and
        (at start (not (track-clear track-switch25-switch28)))
        (at start (not (at ?t switch-28)))
        (at start (train-moving ?t))
        (at start (switch-open switch-25))   ; Apre switch-25 durante movimento
        (at start (switch-open switch-28))   ; Apre switch-28 durante movimento
        (at end (track-clear track-switch25-switch28))
        (at end (at ?t switch-25))
        (at end (not (train-moving ?t)))))

  ;; Da switch-25 a point-7 (percorso inverso)
  (:durative-action move-switch25-point7
    :parameters (?t - train)
    :duration (= ?duration 5)
    :condition (and
        (at start (at ?t switch-25))
        (at start (track-clear track-point7-switch25)))
    :effect (and
        (at start (not (track-clear track-point7-switch25)))
        (at start (not (at ?t switch-25)))
        (at start (train-moving ?t))
        (at end (track-clear track-point7-switch25))
        (at end (at ?t point-7))
        (at end (not (train-moving ?t)))))

  ;; Da point-7 a switch-21 (switch-21 viene aperto durante movimento)
  (:durative-action move-point7-switch21
    :parameters (?t - train)
    :duration (= ?duration 12)
    :condition (and
        (at start (at ?t point-7))
        (at start (track-clear track-switch21-point7)))
    :effect (and
        (at start (not (track-clear track-switch21-point7)))
        (at start (not (at ?t point-7)))
        (at start (train-moving ?t))
        (at start (switch-open switch-21))   ; Apre switch-21 durante movimento
        (at end (track-clear track-switch21-point7))
        (at end (at ?t switch-21))
        (at end (not (train-moving ?t)))))

  ;; Da switch-21 a switch-6 (switch vengono aperti durante movimento)
  (:durative-action move-switch21-switch6
    :parameters (?t - train)
    :duration (= ?duration 7)
    :condition (and
        (at start (at ?t switch-21))
        (at start (track-clear track-switch6-switch21)))
    :effect (and
        (at start (not (track-clear track-switch6-switch21)))
        (at start (not (at ?t switch-21)))
        (at start (train-moving ?t))
        (at start (switch-open switch-6))    ; Apre switch-6 durante movimento
        (at start (switch-open switch-21))   ; Mantiene switch-21 aperto
        (at end (track-clear track-switch6-switch21))
        (at end (at ?t switch-6))
        (at end (not (train-moving ?t)))))

  ;; Da switch-6 a switch-3 (switch vengono chiusi durante movimento)
  (:durative-action move-switch6-switch3
    :parameters (?t - train)
    :duration (= ?duration 20)
    :condition (and
        (at start (at ?t switch-6))
        (at start (track-clear track-switch3-switch6)))
    :effect (and
        (at start (not (track-clear track-switch3-switch6)))
        (at start (not (at ?t switch-6)))
        (at start (train-moving ?t))
        (at start (not (switch-open switch-3)))  ; Chiude switch-3 durante movimento
        (at start (not (switch-open switch-6)))  ; Chiude switch-6 durante movimento
        (at end (track-clear track-switch3-switch6))
        (at end (at ?t switch-3))
        (at end (not (train-moving ?t)))))

  ;; Da switch-3 a switch-8 (switch vengono chiusi durante movimento)
  (:durative-action move-switch3-switch8
    :parameters (?t - train)
    :duration (= ?duration 9)
    :condition (and
        (at start (at ?t switch-3))
        (at start (track-clear track-switch3-switch8))
        (at start (has-stopped ?t))
        (at start (ready-to-exit ?t)))
    :effect (and
        (at start (not (track-clear track-switch3-switch8)))
        (at start (not (at ?t switch-3)))
        (at start (train-moving ?t))
        (at start (not (switch-open switch-3)))  ; Chiude switch-3 durante movimento
        (at start (not (switch-open switch-8)))  ; Chiude switch-8 durante movimento
        (at end (track-clear track-switch3-switch8))
        (at end (at ?t switch-8))
        (at end (not (train-moving ?t)))))

  ;; Da switch-8 a exit-1 (switch-8 viene chiuso durante movimento)
  (:durative-action move-switch8-exit1
    :parameters (?t - train)
    :duration (= ?duration 14)
    :condition (and
        (at start (at ?t switch-8))
        (at start (track-clear track-switch8-exit1))
        (at start (has-stopped ?t))
        (at start (ready-to-exit ?t)))
    :effect (and
        (at start (not (track-clear track-switch8-exit1)))
        (at start (not (at ?t switch-8)))
        (at start (train-moving ?t))
        (at start (not (switch-open switch-8)))  ; Chiude switch-8 durante movimento
        (at end (track-clear track-switch8-exit1))
        (at end (at ?t exit-1))
        (at end (not (train-moving ?t)))))

  ;;-----------------------------------------------------------------------
  ;; Le azioni per operare manualmente gli switch sono state rimosse
  ;; perché ora gli switch cambiano automaticamente durante il movimento
)
