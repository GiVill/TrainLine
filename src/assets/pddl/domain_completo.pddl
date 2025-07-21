(define (domain railway-traffic)
  (:requirements :strips :typing :fluents :durative-actions :timed-initial-literals)

  (:types
    train - object
    position - object
    track - object
    switch - object
    switch - position
    stop-point - position
  )

  (:predicates
    ; Topologia della rete
    (connected ?p1 - position ?p2 - position ?t - track)
    (switch-path ?s - switch ?t1 - track ?t2 - track)
    (switch-status ?s - switch ?t1 - track ?t2 - track)

    ; Stato dei treni
    (train-at ?train - train ?pos - position)
    (can-start ?train - train)
    (completed-stop ?train - train ?stop - stop-point)
    (train-moving ?train - train)
    (train-stopped ?train - train ?stop - stop-point)
    (train-can-exit ?train - train)  ; NUOVO: permesso di andare all'uscita

    ; Assegnazione fermata per treno
    (train-assigned-stop ?train - train ?stop - stop-point)

    ; Occupazione binari
    (track-occupied ?t - track)
    (track-reserved ?t - track ?train - train)

    ; Stato del sistema
    (system-initialized)
  )

  (:functions
    (travel-time ?t - track) - number
    (stop-start-time ?train - train ?stop - stop-point) - number
    (current-time) - number
    (switch-changes) - number
    (total-actions) - number
  )

  ; Azione per far partire un treno
  (:durative-action start-train
    :parameters (?train - train ?start - position ?next - position ?track - track)
    :duration (= ?duration 0.1)
    :condition (and
      (at start (can-start ?train))
      (at start (train-at ?train ?start))
      (at start (connected ?start ?next ?track))
      (at start (not (track-occupied ?track)))
      (at start (not (train-moving ?train)))
    )
    :effect (and
      (at start (track-reserved ?track ?train))
      (at start (track-occupied ?track))
      (at start (train-moving ?train))
      (at end (not (can-start ?train)))
      (at end (increase (total-actions) 1))
    )
  )

  ; Azione per muovere un treno su binario normale (NON verso exit-1)
  (:durative-action move-train
    :parameters (?train - train ?from - position ?to - position ?track - track)
    :duration (= ?duration (travel-time ?track))
    :condition (and
      (at start (train-at ?train ?from))
      (at start (connected ?from ?to ?track))
      (at start (track-reserved ?track ?train))
      (at start (track-occupied ?track))
      (at start (train-moving ?train))
      (over all (track-occupied ?track))
      (at start (not (and (= ?to exit-1) (not (train-can-exit ?train)))))
    )
    :effect (and
      (at start (not (train-at ?train ?from)))
      (at end (train-at ?train ?to))
      (at end (not (track-occupied ?track)))
      (at end (not (track-reserved ?track ?train)))
      (at end (increase (total-actions) 1))
    )
  )

  ; Azione specifica per muoversi verso l'uscita (SOLO se ha completato la fermata)
  (:durative-action move-to-exit
    :parameters (?train - train ?from - position ?track - track)
    :duration (= ?duration (travel-time ?track))
    :condition (and
      (at start (train-at ?train ?from))
      (at start (connected ?from exit-1 ?track))
      (at start (track-reserved ?track ?train))
      (at start (track-occupied ?track))
      (at start (train-moving ?train))
      (at start (train-can-exit ?train))
      (over all (track-occupied ?track))
    )
    :effect (and
      (at start (not (train-at ?train ?from)))
      (at end (train-at ?train exit-1))
      (at end (not (track-occupied ?track)))
      (at end (not (track-reserved ?track ?train)))
      (at end (increase (total-actions) 1))
    )
  )

  ; Azione per fermarsi alla stazione
  (:durative-action arrive-at-stop
    :parameters (?train - train ?from - position ?stop - stop-point ?track - track)
    :duration (= ?duration (travel-time ?track))
    :condition (and
      (at start (train-at ?train ?from))
      (at start (connected ?from ?stop ?track))
      (at start (track-reserved ?track ?train))
      (at start (track-occupied ?track))
      (at start (train-moving ?train))
      (over all (track-occupied ?track))
    )
    :effect (and
      (at start (not (train-at ?train ?from)))
      (at start (not (train-moving ?train)))
      (at end (train-at ?train ?stop))
      (at end (train-stopped ?train ?stop))
      (at end (not (track-occupied ?track)))
      (at end (not (track-reserved ?track ?train)))
      (at end (assign (stop-start-time ?train ?stop) (current-time)))
    )
  )

  ; Azione per sostare alla fermata - MODIFICATA per dare permesso di uscita
  (:durative-action stop-at-station
    :parameters (?train - train ?stop - stop-point)
    :duration (= ?duration 4)
    :condition (and
      (at start (train-stopped ?train ?stop))
      (at start (train-at ?train ?stop))
      (at start (train-assigned-stop ?train ?stop))
      (over all (train-at ?train ?stop))
    )
    :effect (and
      (at end (completed-stop ?train ?stop))
      (at end (not (train-stopped ?train ?stop)))
      (at end (can-start ?train))
      (at end (train-can-exit ?train))  ; NUOVO: ora può andare all'uscita
    )
  )

  ; Azione per prenotare un binario
  (:durative-action reserve-track
    :parameters (?train - train ?track - track)
    :duration (= ?duration 0.05)
    :condition (and
      (at start (not (track-occupied ?track)))
      (at start (not (track-reserved ?track ?train)))
      (at start (train-moving ?train))
    )
    :effect (and
      (at start (track-reserved ?track ?train))
      (at end (track-occupied ?track))
    )
  )

  ; Azione per cambiare stato dello switch - PENALITÀ ALTA PER SCORAGGIARE USO ECCESSIVO!
  (:durative-action switch-track
    :parameters (?switch - switch ?from-track - track ?to-track - track ?alt-from - track ?alt-to - track)
    :duration (= ?duration 1.5)
    :condition (and
      (at start (switch-path ?switch ?from-track ?to-track))
      (at start (switch-path ?switch ?alt-from ?alt-to))
      (at start (switch-status ?switch ?alt-from ?alt-to))
      (at start (not (track-occupied ?from-track)))
      (at start (not (track-occupied ?to-track)))
    )
    :effect (and
      (at end (not (switch-status ?switch ?alt-from ?alt-to)))
      (at end (switch-status ?switch ?from-track ?to-track))
      (at end (increase (switch-changes) 1))
      (at end (increase (total-actions) 5))  ; Penalità alta per switch

    )
  )
)
