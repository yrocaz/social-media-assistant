ALTER TABLE `posts` ADD `approved_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `posts` ADD `rejected_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `posts` ADD `posted_by` text REFERENCES user(id);

UPDATE `posts` SET `approved_by` = (SELECT id FROM user WHERE email = 'franco@momwise.ai') where status = 'approved';
UPDATE `posts` SET `rejected_by` = (SELECT id FROM user WHERE email = 'franco@momwise.ai') where status = 'rejected';
UPDATE `posts` SET `posted_by` = (SELECT id FROM user WHERE email = 'franco@momwise.ai') where status = 'posted';
