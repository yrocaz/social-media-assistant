ALTER TABLE `posts` ADD `created_by` text REFERENCES user(id);
UPDATE `posts` SET `created_by` = (SELECT id FROM user WHERE email = 'franco@momwise.ai');