-- Apply once to waters_refuge_ball before enabling hostess table payments.
-- No existing attendee or payment data is changed.
CREATE TABLE IF NOT EXISTS paymentCheckouts (
  id varchar(36) NOT NULL PRIMARY KEY,
  hostessUuid varchar(64) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  requestJson longtext NOT NULL,
  selectionsJson longtext NOT NULL,
  total int NOT NULL,
  paymentId varchar(255) DEFAULT NULL,
  receiptUrl varchar(255) DEFAULT NULL,
  created datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY hostess_status (hostessUuid, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS paymentClaims (
  attendeeUuid varchar(64) NOT NULL PRIMARY KEY,
  checkoutId varchar(36) NOT NULL,
  KEY checkout_id (checkoutId)
) ENGINE=InnoDB;
