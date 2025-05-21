CREATE TABLE log_swap (
    id CHAR(36) PRIMARY KEY,
    token_address VARCHAR(100) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    from_date DATETIME NOT NULL,
    to_date DATETIME NOT NULL
);
