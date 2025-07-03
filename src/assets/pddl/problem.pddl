;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; PROBLEM FERROVIARIO BASE – PDDL 2.1                                  ;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(define (problem railway-scheduling)
  (:domain railway-system)

  ;;-----------------------------------------------------------------------
  ;; Objects
  (:objects
      t1 t2                                        - train
      start-1 start-2 switch-1 switch-3 switch-6 switch-8 switch-9
      switch-11 switch-21 switch-25 switch-28 point-7 point-8
      stop-1 stop-3 stop-5 stop-7                 - point
      track-start1-switch1 track-start2-switch8 track-switch1-switch3
      track-switch8-switch1 track-switch8-switch9 track-switch3-switch9
      track-switch3-switch6 track-switch9-switch11 track-switch6-switch21
      track-switch6-point8 track-switch21-point7 track-switch21-stop5
      track-point7-switch25 track-switch25-switch28 track-switch25-stop3
      track-switch28-stop1 track-point8-switch11 track-switch11-stop7  - track
      switch-1 switch-3 switch-6 switch-8 switch-9
      switch-11 switch-21 switch-25 switch-28      - switch)

  ;;-----------------------------------------------------------------------
  ;; Initial state
  (:init
      ;; Posizione iniziale dei treni
      (at t1 start-1)
      (at t2 start-2)

      ;; T1 può partire subito, T2 deve aspettare
      (can-depart t1)
      (not (can-depart t2))

      ;; Tutti i binari inizialmente liberi
      (track-clear track-start1-switch1) (track-clear track-start2-switch8)
      (track-clear track-switch1-switch3) (track-clear track-switch8-switch1)
      (track-clear track-switch8-switch9) (track-clear track-switch3-switch9)
      (track-clear track-switch3-switch6) (track-clear track-switch9-switch11)
      (track-clear track-switch6-switch21) (track-clear track-switch6-point8)
      (track-clear track-switch21-point7) (track-clear track-switch21-stop5)
      (track-clear track-point7-switch25) (track-clear track-switch25-switch28)
      (track-clear track-switch25-stop3) (track-clear track-switch28-stop1)
      (track-clear track-point8-switch11) (track-clear track-switch11-stop7)

      ;; Switch inizialmente chiusi
      (not (switch-open switch-1)) (not (switch-open switch-3))
      (not (switch-open switch-6)) (not (switch-open switch-8))
      (not (switch-open switch-9)) (not (switch-open switch-11))
      (not (switch-open switch-21)) (not (switch-open switch-25))
      (not (switch-open switch-28))

      ;; Inizializza tempo d'arrivo a 0
      (= (time-arrived t1) 0)
      (= (time-arrived t2) 0))

  ;;-----------------------------------------------------------------------
  ;; Obiettivo: t1 deve arrivare a stop-1, t2 deve arrivare a stop-3
  ;; con t2 che arriva almeno 10 secondi dopo t1
  (:goal (and
    (at t1 stop-1)
    (at t2 stop-3)
    (>= (- (time-arrived t2) (time-arrived t1)) 10)))

  ;; Metrica: minimizzare il tempo totale
  (:metric minimize (total-time))
)
