;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; PROBLEM FERROVIARIO MODIFICATO – PDDL 2.1 (Con T3 e nuovi percorsi)  ;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(define (problem railway-scheduling)
  (:domain railway-system)
  ;;-----------------------------------------------------------------------
  ;; Objects
  (:objects
      t1 t2 t3                                     - train
      start-1 switch-1 switch-3 switch-6 switch-8 switch-9
      switch-11 switch-21 switch-25 switch-28 point-7 point-8
      stop-1 stop-3 stop-5 stop-7 exit-1          - point
      track-start1-switch1 track-switch1-switch3 track-switch3-switch6
      track-switch6-switch21 track-switch21-point7 track-point7-switch25
      track-switch25-switch28 track-switch25-stop3 track-switch28-stop1
      track-switch1-switch8 track-switch8-exit1
      track-switch3-switch9 track-switch9-switch11 track-switch6-point8
      track-point8-switch11 track-switch11-stop7 track-switch9-switch8  - track
      switch-1 switch-3 switch-6 switch-8 switch-9
      switch-11 switch-21 switch-25 switch-28      - switch)
  ;;-----------------------------------------------------------------------
  ;; Initial state
  (:init
      ;; Tutti e tre i treni partono da start-1
      (at t1 start-1)
      (at t2 start-1)
      (at t3 start-1)
      
      ;; Tutti i treni devono aspettare i loro tempi di partenza
      (not (can-depart t1))
      (not (can-depart t2))
      (not (can-depart t3))
      
      ;; Nessun treno ha ancora effettuato la fermata
      (not (has-stopped t1))
      (not (has-stopped t2))
      (not (has-stopped t3))
      (not (ready-to-exit t1))
      (not (ready-to-exit t2))
      (not (ready-to-exit t3))

      ;; Assegnazione delle destinazioni
      (assigned-to t1 stop-1)
      (assigned-to t2 stop-3)
      (assigned-to t3 stop-7)

      ;; Tutti i binari inizialmente liberi (inclusi i nuovi per T3)
      (track-clear track-start1-switch1)
      (track-clear track-switch1-switch3)
      (track-clear track-switch3-switch6)
      (track-clear track-switch6-switch21)
      (track-clear track-switch21-point7)
      (track-clear track-point7-switch25)
      (track-clear track-switch25-switch28)
      (track-clear track-switch25-stop3)
      (track-clear track-switch28-stop1)
      (track-clear track-switch1-switch8)
      (track-clear track-switch8-exit1)
      (track-clear track-switch3-switch9)
      (track-clear track-switch9-switch11)
      (track-clear track-switch6-point8)
      (track-clear track-point8-switch11)
      (track-clear track-switch11-stop7)
      (track-clear track-switch9-switch8)

      ;; Switch inizialmente chiusi
      (not (switch-open switch-1)) (not (switch-open switch-3))
      (not (switch-open switch-6)) (not (switch-open switch-8))
      (not (switch-open switch-9)) (not (switch-open switch-11))
      (not (switch-open switch-21)) (not (switch-open switch-25))
      (not (switch-open switch-28))

      ;; Inizializza tempo d'arrivo a 0
      (= (time-arrived t1) 0)
      (= (time-arrived t2) 0)
      (= (time-arrived t3) 0))

  ;;-----------------------------------------------------------------------
  ;; Obiettivo: t1 deve passare per stop-1, t2 per stop-3, t3 per stop-7, poi tutti a exit-1
  (:goal (and
    (at t1 exit-1)
    (at t2 exit-1)
    (at t3 exit-1)
    (has-stopped t1)
    (has-stopped t2)
    (has-stopped t3)))

  ;; Metrica: minimizzare il tempo totale
  (:metric minimize (total-time))
)