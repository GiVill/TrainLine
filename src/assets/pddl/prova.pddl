;;track monodirezionali Nodo-1 -> Nodo-2

;; Tempi di percorrenza (unitÓ = lunghezza euclidea)
(travel_time switch-28 stop-1 62.40) ;; track-1
(travel_time switch-25 switch-28 21.82) ;; track-36
(travel_time switch-25 stop-3 65.20) ;; track-3
(travel_time point-7 switch-25 4.50) ;; track-5
(travel_time switch-21 point-7 21.82) ;; track-6
(travel_time switch-21 stop-5 81.90) ;; track-9
(travel_time switch-6 switch-21 10.60) ;; track-39
(travel_time switch-6 point-8 3.04) ;; track-11
(travel_time point-8 switch-11 10.60) ;; track-40
(travel_time switch-11 stop-7 82.40) ;; track-12
(travel_time switch-3 switch-6 247.10) ;; track-16
(travel_time switch-9 switch-11 234.00) ;; track-17
(travel_time switch-1 switch-3 13.20) ;; track-31
(travel_time switch-3 switch-9 10.60) ;; track-50
(travel_time switch-8 switch-9 35.00) ;; track-33
(travel_time switch-8 switch-1 10.60) ;; track-35
(travel_time start-1 switch-1 63.94) ;; track-32
(travel_time start-2 switch-8 57.10) ;; track-34

;; regole per switch(open | closed) quali percorsi sono possibili a seconda dello stato dello switch
switch-28:
        - open (treack-36 -> track-1)
        - closed (null)
switch-25:
        - open (treack-5 -> track-36)
        - closed (treack-5 -> track-3)
switch-21:
        - open (treack-39 -> track-6)
        - closed (treack-39 -> track-9)
switch-6:
        - open (treack-16 -> track-39)
        - closed (treack-16 -> track-11)
switch-11:
        - open (treack-40 -> track-12)
        - closed (treack-17 -> track-12)
switch-3:
        - open (treack-31 -> track-50)
        - closed (treack-31 -> track-16)
switch-9:
        - open (treack-50 -> track-17)
        - closed (treack-33 -> track-17)
switch-1:
        - open (treack-35 -> track-31)
        - closed (treack-32 -> track-31)
switch-8:
        - open (treack-34 -> track-35)
        - closed (treack-34 -> track-33)

;; ogni switch impiega 2 minuti per essere aperto o chiuso
