-- Migration 0009: Add CalDAV, CardDAV, and SMTP settings support
ALTER TABLE users ADD COLUMN caldav_url TEXT;
ALTER TABLE users ADD COLUMN caldav_username TEXT;
ALTER TABLE users ADD COLUMN caldav_password TEXT;
ALTER TABLE users ADD COLUMN caldav_calendar_path TEXT;

ALTER TABLE users ADD COLUMN carddav_url TEXT;
ALTER TABLE users ADD COLUMN carddav_username TEXT;
ALTER TABLE users ADD COLUMN carddav_password TEXT;

ALTER TABLE users ADD COLUMN smtp_host TEXT;
ALTER TABLE users ADD COLUMN smtp_port INTEGER DEFAULT 587;
ALTER TABLE users ADD COLUMN smtp_username TEXT;
ALTER TABLE users ADD COLUMN smtp_password TEXT;
ALTER TABLE users ADD COLUMN smtp_secure BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN smtp_from TEXT;

ALTER TABLE bookings ADD COLUMN caldav_event_id TEXT;
