;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; DOMAIN FERROVIARIO BASE – PDDL 2.1 (Massima Compatibilità)           ;;
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
    (can-depart ?t - train))  ; Indica se il treno può partire

  ;;-----------------------------------------------------------------------
  ;; Numeric fluents
  (:functions
    (time-arrived ?t - train)
    (travel-time ?from ?to - point))

  ;;-----------------------------------------------------------------------
  ;; Azione per abilitare la partenza ritardata di T2
  (:durative-action enable-departure-t2
    :parameters ()
    :duration (= ?duration 600)  ; 10 minuti
    :condition (at start (not (can-depart t2)))
    :effect (at end (can-depart t2)))

  ;;-----------------------------------------------------------------------
  ;; Movimenti specifici con controlli switch espliciti

  ;; Da start-1 a switch-1 (switch-1 deve essere chiuso)
  (:durative-action move-start1-switch1
    :parameters (?t - train)
    :duration (= ?duration 63.94)
    :condition (and
        (at start (at ?t start-1))
        (at start (track-clear track-start1-switch1))
        (at start (not (switch-open switch-1)))
        (at start (can-depart ?t)))
    :effect (and
        (at start (not (track-clear track-start1-switch1)))
        (at start (not (at ?t start-1)))
        (at start (train-moving ?t))
        (at end (track-clear track-start1-switch1))
        (at end (at ?t switch-1))
        (at end (not (train-moving ?t)))))

  ;; Da start-2 a switch-8 (switch-8 deve essere chiuso)
  (:durative-action move-start2-switch8
    :parameters (?t - train)
    :duration (= ?duration 57.10)
    :condition (and
        (at start (at ?t start-2))
        (at start (track-clear track-start2-switch8))
        (at start (not (switch-open switch-8)))
        (at start (can-depart ?t)))
    :effect (and
        (at start (not (track-clear track-start2-switch8)))
        (at start (not (at ?t start-2)))
        (at start (train-moving ?t))
        (at end (track-clear track-start2-switch8))
        (at end (at ?t switch-8))
        (at end (not (train-moving ?t)))))

  ;; Da switch-1 a switch-3 (entrambi switch chiusi)
  (:durative-action move-switch1-switch3
    :parameters (?t - train)
    :duration (= ?duration 13.20)
    :condition (and
        (at start (at ?t switch-1))
        (at start (track-clear track-switch1-switch3))
        (at start (not (switch-open switch-1)))
        (at start (not (switch-open switch-3))))
    :effect (and
        (at start (not (track-clear track-switch1-switch3)))
        (at start (not (at ?t switch-1)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch1-switch3))
        (at end (at ?t switch-3))
        (at end (not (train-moving ?t)))))

  ;; Da switch-8 a switch-1 (entrambi switch aperti)
  (:durative-action move-switch8-switch1
    :parameters (?t - train)
    :duration (= ?duration 10.60)
    :condition (and
        (at start (at ?t switch-8))
        (at start (track-clear track-switch8-switch1))
        (at start (switch-open switch-8))
        (at start (switch-open switch-1)))
    :effect (and
        (at start (not (track-clear track-switch8-switch1)))
        (at start (not (at ?t switch-8)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch8-switch1))
        (at end (at ?t switch-1))
        (at end (not (train-moving ?t)))))

  ;; Da switch-8 a switch-9 (switch-8 chiuso)
  (:durative-action move-switch8-switch9
    :parameters (?t - train)
    :duration (= ?duration 35.00)
    :condition (and
        (at start (at ?t switch-8))
        (at start (track-clear track-switch8-switch9))
        (at start (not (switch-open switch-8))))
    :effect (and
        (at start (not (track-clear track-switch8-switch9)))
        (at start (not (at ?t switch-8)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch8-switch9))
        (at end (at ?t switch-9))
        (at end (not (train-moving ?t)))))

  ;; Da switch-3 a switch-6 (entrambi switch chiusi)
  (:durative-action move-switch3-switch6
    :parameters (?t - train)
    :duration (= ?duration 247.10)
    :condition (and
        (at start (at ?t switch-3))
        (at start (track-clear track-switch3-switch6))
        (at start (not (switch-open switch-3)))
        (at start (not (switch-open switch-6))))
    :effect (and
        (at start (not (track-clear track-switch3-switch6)))
        (at start (not (at ?t switch-3)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch3-switch6))
        (at end (at ?t switch-6))
        (at end (not (train-moving ?t)))))

  ;; Da switch-6 a switch-21 (entrambi switch aperti)
  (:durative-action move-switch6-switch21
    :parameters (?t - train)
    :duration (= ?duration 10.60)
    :condition (and
        (at start (at ?t switch-6))
        (at start (track-clear track-switch6-switch21))
        (at start (switch-open switch-6))
        (at start (switch-open switch-21)))
    :effect (and
        (at start (not (track-clear track-switch6-switch21)))
        (at start (not (at ?t switch-6)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch6-switch21))
        (at end (at ?t switch-21))
        (at end (not (train-moving ?t)))))

  ;; Da switch-21 a point-7 (switch-21 aperto)
  (:durative-action move-switch21-point7
    :parameters (?t - train)
    :duration (= ?duration 21.82)
    :condition (and
        (at start (at ?t switch-21))
        (at start (track-clear track-switch21-point7))
        (at start (switch-open switch-21)))
    :effect (and
        (at start (not (track-clear track-switch21-point7)))
        (at start (not (at ?t switch-21)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch21-point7))
        (at end (at ?t point-7))
        (at end (not (train-moving ?t)))))

  ;; Da point-7 a switch-25 (nessun vincolo switch)
  (:durative-action move-point7-switch25
    :parameters (?t - train)
    :duration (= ?duration 4.50)
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

  ;; Da switch-25 a switch-28 (entrambi switch aperti)
  (:durative-action move-switch25-switch28
    :parameters (?t - train)
    :duration (= ?duration 21.82)
    :condition (and
        (at start (at ?t switch-25))
        (at start (track-clear track-switch25-switch28))
        (at start (switch-open switch-25))
        (at start (switch-open switch-28)))
    :effect (and
        (at start (not (track-clear track-switch25-switch28)))
        (at start (not (at ?t switch-25)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch25-switch28))
        (at end (at ?t switch-28))
        (at end (not (train-moving ?t)))))

  ;; Da switch-25 a stop-3 (switch-25 chiuso) - DESTINAZIONE FINALE
  (:durative-action move-switch25-stop3
    :parameters (?t - train)
    :duration (= ?duration 65.20)
    :condition (and
        (at start (at ?t switch-25))
        (at start (track-clear track-switch25-stop3))
        (at start (not (switch-open switch-25))))
    :effect (and
        (at start (not (track-clear track-switch25-stop3)))
        (at start (not (at ?t switch-25)))
        (at start (train-moving ?t))
        (at end (track-clear track-switch25-stop3))
        (at end (at ?t stop-3))
        (at end (not (train-moving ?t)))
        (at end (assign (time-arrived ?t) (total-time)))))

  ;; Da switch-28 a stop-1 (nessun vincolo switch) - DESTINAZIONE FINALE
  (:durative-action move-switch28-stop1
    :parameters (?t - train)
    :duration (= ?duration 62.40)
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
  ;; Azioni per operare gli switch (durata 2 secondi)

  (:durative-action open-switch
    :parameters (?s - switch)
    :duration (= ?duration 2)
    :condition (at start (not (switch-open ?s)))
    :effect (at end (switch-open ?s)))

  (:durative-action close-switch
    :parameters (?s - switch)
    :duration (= ?duration 2)
    :condition (at start (switch-open ?s))
    :effect (at end (not (switch-open ?s))))
)
