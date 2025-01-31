;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u100))
(define-constant err-nonprofit-not-found (err u101))
(define-constant err-already-registered (err u102))
(define-constant err-invalid-amount (err u103))

;; Data vars
(define-map nonprofits
  { nonprofit-id: principal }
  {
    name: (string-utf8 256),
    verified: bool,
    total-donations: uint,
    registration-date: uint
  }
)

(define-map donations
  { donation-id: uint }
  {
    donor: principal,
    nonprofit: principal,
    amount: uint,
    timestamp: uint
  }
)

(define-data-var donation-counter uint u0)

;; Register nonprofit
(define-public (register-nonprofit (name (string-utf8 256)))
  (let ((nonprofit-exists (get verified (map-get? nonprofits {nonprofit-id: tx-sender}))))
    (asserts! (is-eq nonprofit-exists none) err-already-registered)
    (ok (map-set nonprofits
      {nonprofit-id: tx-sender}
      {
        name: name,
        verified: false,
        total-donations: u0,
        registration-date: block-height
      }
    ))
  )
)

;; Verify nonprofit - only owner
(define-public (verify-nonprofit (nonprofit principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
    (match (map-get? nonprofits {nonprofit-id: nonprofit})
      nonprofit-data (ok (map-set nonprofits
        {nonprofit-id: nonprofit}
        (merge nonprofit-data {verified: true})
      ))
      err-nonprofit-not-found
    )
  )
)

;; Make donation
(define-public (donate (nonprofit principal) (amount uint))
  (let (
    (nonprofit-data (unwrap! (map-get? nonprofits {nonprofit-id: nonprofit}) err-nonprofit-not-found))
    (donation-id (var-get donation-counter))
  )
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (get verified nonprofit-data) err-unauthorized)
    (try! (stx-transfer? amount tx-sender nonprofit))
    (var-set donation-counter (+ donation-id u1))
    (map-set donations
      {donation-id: donation-id}
      {
        donor: tx-sender,
        nonprofit: nonprofit,
        amount: amount,
        timestamp: block-height
      }
    )
    (ok donation-id)
  )
)

;; Read only functions
(define-read-only (get-nonprofit-info (nonprofit principal))
  (map-get? nonprofits {nonprofit-id: nonprofit})
)

(define-read-only (get-donation-info (donation-id uint))
  (map-get? donations {donation-id: donation-id})
)
