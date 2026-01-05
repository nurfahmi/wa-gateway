-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:8889
-- Generation Time: Jan 05, 2026 at 03:06 PM
-- Server version: 5.7.39
-- PHP Version: 8.2.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `whatsapp_gateway`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_configurations`
--

CREATE TABLE `ai_configurations` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `account_id` int(10) UNSIGNED DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT '0',
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'openai',
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'gpt-4',
  `system_prompt` text COLLATE utf8mb4_unicode_ci,
  `bot_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Assistant',
  `temperature` decimal(3,2) DEFAULT '0.70',
  `max_tokens` int(11) DEFAULT '500',
  `auto_reply_enabled` tinyint(1) DEFAULT '0',
  `auto_reply_delay_seconds` int(11) DEFAULT '2',
  `language` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `fallback_message` text COLLATE utf8mb4_unicode_ci,
  `conversation_memory_enabled` tinyint(1) DEFAULT '1',
  `conversation_memory_messages` int(11) DEFAULT '10',
  `rate_limit_per_hour` int(11) DEFAULT '100',
  `business_hours_only` tinyint(1) DEFAULT '0',
  `business_hours` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ai_configurations`
--

INSERT INTO `ai_configurations` (`id`, `workspace_id`, `account_id`, `is_enabled`, `provider`, `model`, `system_prompt`, `bot_name`, `temperature`, `max_tokens`, `auto_reply_enabled`, `auto_reply_delay_seconds`, `language`, `fallback_message`, `conversation_memory_enabled`, `conversation_memory_messages`, `rate_limit_per_hour`, `business_hours_only`, `business_hours`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 0, 'openai', 'gpt-4', 'You are a helpful customer support assistant. Be friendly, professional, and concise.', 'Support Bot', '0.70', 500, 0, 2, 'en', NULL, 1, 10, 100, 0, NULL, '2026-01-03 17:10:41', '2026-01-03 17:10:41');

-- --------------------------------------------------------

--
-- Table structure for table `api_keys`
--

CREATE TABLE `api_keys` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `key_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_prefix` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auto_reply_rules`
--

CREATE TABLE `auto_reply_rules` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `account_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_type` enum('keyword','exact_match','contains','regex','business_hours','welcome','fallback') COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_value` text COLLATE utf8mb4_unicode_ci,
  `reply_message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `reply_type` enum('text','template') COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `template_id` int(10) UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `priority` int(11) DEFAULT '0',
  `delay_seconds` int(11) DEFAULT '0',
  `max_triggers_per_contact` int(11) DEFAULT NULL,
  `conditions` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `auto_reply_rules`
--

INSERT INTO `auto_reply_rules` (`id`, `workspace_id`, `account_id`, `name`, `trigger_type`, `trigger_value`, `reply_message`, `reply_type`, `template_id`, `is_active`, `priority`, `delay_seconds`, `max_triggers_per_contact`, `conditions`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'Welcome New Contacts', 'welcome', NULL, 'Hi! 👋 Thanks for reaching out. How can I assist you today?', 'text', NULL, 1, 100, 0, NULL, NULL, '2026-01-03 17:10:41', '2026-01-03 17:10:41'),
(2, 1, NULL, 'Pricing Inquiry', 'contains', 'price,pricing,cost,how much', 'Thanks for your interest! Our pricing starts at $99/month. Visit our website for details.', 'text', NULL, 1, 90, 0, NULL, NULL, '2026-01-03 17:10:41', '2026-01-03 17:10:41');

-- --------------------------------------------------------

--
-- Table structure for table `broadcast_messages`
--

CREATE TABLE `broadcast_messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `account_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_id` int(10) UNSIGNED DEFAULT NULL,
  `media_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_type` enum('image','document','video','audio') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_type` enum('all_contacts','group','custom') COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_group_id` int(10) UNSIGNED DEFAULT NULL,
  `target_phone_numbers` json DEFAULT NULL,
  `status` enum('draft','scheduled','sending','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `total_recipients` int(11) DEFAULT '0',
  `sent_count` int(11) DEFAULT '0',
  `failed_count` int(11) DEFAULT '0',
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `custom_fields` json DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `message_count` int(11) DEFAULT '0',
  `is_blocked` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contact_groups`
--

CREATE TABLE `contact_groups` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `contact_ids` json DEFAULT NULL,
  `contact_count` int(11) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conversation_logs`
--

CREATE TABLE `conversation_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `account_id` int(10) UNSIGNED NOT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','assistant','system') COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_logs`
--

CREATE TABLE `message_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `account_id` int(10) UNSIGNED NOT NULL,
  `message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direction` enum('incoming','outgoing') COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_type` enum('text','image','document','video','audio') COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `content` text COLLATE utf8mb4_unicode_ci,
  `media_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caption` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','sent','delivered','read','failed','received') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `provider_response` json DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `message_logs`
--

INSERT INTO `message_logs` (`id`, `workspace_id`, `account_id`, `message_id`, `direction`, `from_number`, `to_number`, `message_type`, `content`, `media_url`, `caption`, `status`, `error_message`, `provider_response`, `sent_at`, `delivered_at`, `read_at`) VALUES
(1, 2, 42, NULL, 'outgoing', '085786611365', '6285742274637', 'image', 'Check this image', NULL, NULL, 'sent', NULL, '{\"device\": {\"id\": 46, \"alias\": \"account_42\"}, \"result\": {\"type\": \"text\", \"status\": \"sent\"}, \"message\": \"Message sent successfully\", \"success\": true}', '2026-01-05 03:21:26', NULL, NULL),
(2, 2, 42, NULL, 'outgoing', '085786611365', '6285742274637', 'text', '✅ WhatsApp notification test from your membership system. This confirms your WhatsApp integration is working correctly!', NULL, NULL, 'sent', NULL, '{\"device\": {\"id\": 46, \"alias\": \"account_42\"}, \"result\": {\"type\": \"text\", \"status\": \"sent\"}, \"message\": \"Message sent successfully\", \"success\": true}', '2026-01-05 04:04:45', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `message_templates`
--

CREATE TABLE `message_templates` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `variables` json DEFAULT NULL,
  `media_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_type` enum('image','document','video','audio') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usage_count` int(11) DEFAULT '0',
  `last_used_at` timestamp NULL DEFAULT NULL,
  `is_favorite` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `message_templates`
--

INSERT INTO `message_templates` (`id`, `workspace_id`, `name`, `content`, `category`, `variables`, `media_url`, `media_type`, `usage_count`, `last_used_at`, `is_favorite`, `created_at`, `updated_at`) VALUES
(1, 1, 'Welcome Message', 'Hi {{name}}! 👋 Welcome to our service. How can I help you today?', 'greeting', '[\"name\"]', NULL, NULL, 0, NULL, 0, '2026-01-03 17:10:41', '2026-01-03 17:10:41'),
(2, 1, 'Business Hours', 'Thank you for your message! Our business hours are Mon-Fri, 9AM-5PM. We\'ll respond during business hours.', 'support', '[]', NULL, NULL, 0, NULL, 0, '2026-01-03 17:10:41', '2026-01-03 17:10:41'),
(3, 1, 'Away Message', 'I\'m currently away. I\'ll get back to you as soon as possible. For urgent matters, call +1234567890.', 'support', '[]', NULL, NULL, 0, NULL, 0, '2026-01-03 17:10:41', '2026-01-03 17:10:41');

-- --------------------------------------------------------

--
-- Table structure for table `rate_limits`
--

CREATE TABLE `rate_limits` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `window_start` timestamp NOT NULL,
  `request_count` int(10) UNSIGNED DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rate_limits`
--

INSERT INTO `rate_limits` (`id`, `workspace_id`, `window_start`, `request_count`) VALUES
(1, 2, '2026-01-03 17:15:00', 1),
(2, 2, '2026-01-03 17:17:00', 1),
(3, 2, '2026-01-03 17:18:00', 1),
(4, 2, '2026-01-03 17:19:00', 1),
(5, 2, '2026-01-03 17:29:00', 1),
(6, 2, '2026-01-03 17:31:00', 1),
(7, 2, '2026-01-03 17:36:00', 1),
(8, 2, '2026-01-03 17:38:00', 1),
(9, 2, '2026-01-03 17:39:00', 1),
(10, 2, '2026-01-03 17:41:00', 1),
(11, 2, '2026-01-03 17:43:00', 1),
(12, 2, '2026-01-03 17:48:00', 1),
(13, 2, '2026-01-03 17:55:00', 9),
(22, 2, '2026-01-03 17:56:00', 12),
(34, 2, '2026-01-03 18:07:00', 21),
(55, 2, '2026-01-03 18:11:00', 3),
(58, 2, '2026-01-03 18:12:00', 20),
(78, 2, '2026-01-03 18:13:00', 20),
(98, 2, '2026-01-03 18:14:00', 1),
(99, 2, '2026-01-03 18:17:00', 3),
(102, 2, '2026-01-03 18:18:00', 12),
(114, 3, '2026-01-03 20:22:00', 1),
(115, 3, '2026-01-03 20:23:00', 1),
(116, 3, '2026-01-03 20:25:00', 1),
(117, 3, '2026-01-03 20:26:00', 14),
(131, 3, '2026-01-03 20:27:00', 1),
(132, 3, '2026-01-03 20:28:00', 10),
(142, 3, '2026-01-03 20:29:00', 20),
(162, 3, '2026-01-03 20:30:00', 19),
(181, 3, '2026-01-03 20:31:00', 20),
(201, 3, '2026-01-03 20:32:00', 42),
(243, 3, '2026-01-03 20:33:00', 29),
(272, 3, '2026-01-03 20:34:00', 24),
(296, 3, '2026-01-03 20:35:00', 3),
(297, 3, '2026-01-03 20:36:00', 6),
(298, 3, '2026-01-03 20:38:00', 28),
(326, 3, '2026-01-03 20:39:00', 19),
(345, 3, '2026-01-03 20:40:00', 9),
(354, 3, '2026-01-03 20:41:00', 3),
(357, 3, '2026-01-03 20:47:00', 2),
(359, 3, '2026-01-03 20:52:00', 1),
(360, 3, '2026-01-03 20:53:00', 1),
(361, 3, '2026-01-03 20:54:00', 2),
(362, 3, '2026-01-03 21:16:00', 1),
(363, 3, '2026-01-03 21:17:00', 1),
(364, 3, '2026-01-03 21:18:00', 1),
(365, 3, '2026-01-03 21:22:00', 8),
(373, 3, '2026-01-03 21:23:00', 7),
(380, 3, '2026-01-03 21:24:00', 6),
(386, 3, '2026-01-03 21:25:00', 11),
(397, 3, '2026-01-03 21:26:00', 2),
(399, 3, '2026-01-03 21:37:00', 1),
(400, 3, '2026-01-03 21:39:00', 1),
(401, 3, '2026-01-03 21:41:00', 2),
(403, 3, '2026-01-03 21:47:00', 2),
(405, 3, '2026-01-03 21:54:00', 1),
(406, 3, '2026-01-03 21:55:00', 1),
(407, 3, '2026-01-03 21:56:00', 9),
(416, 3, '2026-01-03 21:57:00', 2),
(418, 3, '2026-01-03 21:58:00', 2),
(420, 3, '2026-01-03 21:59:00', 2),
(422, 3, '2026-01-03 22:01:00', 3),
(425, 3, '2026-01-03 22:08:00', 6),
(431, 3, '2026-01-03 22:10:00', 9),
(440, 3, '2026-01-03 22:11:00', 1),
(441, 3, '2026-01-03 22:13:00', 5),
(446, 3, '2026-01-03 22:14:00', 4),
(450, 3, '2026-01-03 22:16:00', 1),
(451, 3, '2026-01-03 22:17:00', 4),
(455, 3, '2026-01-03 22:18:00', 2),
(457, 3, '2026-01-03 22:20:00', 2),
(459, 3, '2026-01-03 22:58:00', 1),
(460, 3, '2026-01-03 23:05:00', 1),
(461, 3, '2026-01-03 23:06:00', 2),
(463, 3, '2026-01-03 23:08:00', 2),
(465, 3, '2026-01-03 23:10:00', 4),
(469, 3, '2026-01-03 23:11:00', 1),
(470, 3, '2026-01-03 23:42:00', 1),
(471, 3, '2026-01-03 23:43:00', 1),
(472, 3, '2026-01-03 23:44:00', 1),
(473, 3, '2026-01-03 23:46:00', 1),
(474, 3, '2026-01-03 23:47:00', 1),
(475, 3, '2026-01-03 23:48:00', 2),
(477, 3, '2026-01-03 23:49:00', 1),
(478, 3, '2026-01-03 23:52:00', 1),
(479, 3, '2026-01-03 23:54:00', 2),
(481, 3, '2026-01-03 23:55:00', 5),
(486, 3, '2026-01-03 23:56:00', 2),
(488, 3, '2026-01-04 00:02:00', 2),
(490, 3, '2026-01-04 00:04:00', 1),
(491, 3, '2026-01-04 00:07:00', 2),
(493, 3, '2026-01-04 00:11:00', 1),
(494, 3, '2026-01-04 00:13:00', 1),
(495, 2, '2026-01-04 18:46:00', 1),
(496, 3, '2026-01-04 18:47:00', 1),
(497, 3, '2026-01-04 18:48:00', 1),
(498, 3, '2026-01-04 18:52:00', 3),
(499, 3, '2026-01-04 19:05:00', 1),
(500, 3, '2026-01-04 19:10:00', 1),
(501, 3, '2026-01-04 19:11:00', 1),
(502, 3, '2026-01-04 19:30:00', 2),
(504, 3, '2026-01-04 19:31:00', 1),
(505, 3, '2026-01-04 19:32:00', 1),
(506, 3, '2026-01-04 19:34:00', 1),
(507, 3, '2026-01-04 19:37:00', 1),
(508, 3, '2026-01-04 19:38:00', 1),
(509, 3, '2026-01-04 19:44:00', 1),
(510, 3, '2026-01-04 20:05:00', 2),
(512, 3, '2026-01-04 20:10:00', 1),
(513, 3, '2026-01-04 20:12:00', 11),
(524, 3, '2026-01-04 20:16:00', 20),
(544, 3, '2026-01-04 20:17:00', 1),
(545, 3, '2026-01-04 20:42:00', 2),
(547, 3, '2026-01-04 20:43:00', 6),
(553, 3, '2026-01-04 20:46:00', 1),
(554, 3, '2026-01-04 20:49:00', 1),
(555, 3, '2026-01-04 20:52:00', 3),
(556, 2, '2026-01-04 21:13:00', 1),
(557, 2, '2026-01-04 21:14:00', 2),
(559, 3, '2026-01-04 21:14:00', 1),
(560, 3, '2026-01-04 21:22:00', 1),
(561, 3, '2026-01-04 21:49:00', 2),
(563, 3, '2026-01-04 21:50:00', 4),
(567, 3, '2026-01-04 22:18:00', 4),
(571, 3, '2026-01-04 22:21:00', 2),
(573, 3, '2026-01-04 22:39:00', 3),
(576, 3, '2026-01-04 22:40:00', 1),
(577, 3, '2026-01-04 22:46:00', 3),
(578, 3, '2026-01-04 22:53:00', 2),
(580, 3, '2026-01-04 22:55:00', 8),
(588, 3, '2026-01-04 22:56:00', 4),
(592, 3, '2026-01-04 22:57:00', 10),
(602, 3, '2026-01-04 22:58:00', 2),
(604, 3, '2026-01-04 23:00:00', 2),
(606, 3, '2026-01-04 23:06:00', 6),
(612, 3, '2026-01-04 23:07:00', 20),
(632, 3, '2026-01-04 23:08:00', 16),
(648, 3, '2026-01-04 23:10:00', 16),
(664, 3, '2026-01-04 23:11:00', 17),
(681, 3, '2026-01-04 23:12:00', 6),
(687, 3, '2026-01-04 23:15:00', 13),
(700, 3, '2026-01-04 23:18:00', 14),
(714, 3, '2026-01-04 23:26:00', 8),
(722, 3, '2026-01-04 23:27:00', 1),
(723, 3, '2026-01-04 23:28:00', 8),
(731, 3, '2026-01-04 23:29:00', 5),
(736, 3, '2026-01-04 23:30:00', 1),
(737, 3, '2026-01-04 23:31:00', 1),
(738, 3, '2026-01-04 23:33:00', 6),
(744, 3, '2026-01-04 23:34:00', 10),
(754, 3, '2026-01-04 23:47:00', 1),
(755, 3, '2026-01-04 23:49:00', 1),
(756, 3, '2026-01-04 23:50:00', 11),
(767, 3, '2026-01-04 23:51:00', 10),
(777, 3, '2026-01-04 23:54:00', 1),
(778, 3, '2026-01-05 00:15:00', 7),
(785, 3, '2026-01-05 00:18:00', 7),
(792, 3, '2026-01-05 00:19:00', 3),
(795, 3, '2026-01-05 00:23:00', 8),
(803, 3, '2026-01-05 00:24:00', 8),
(811, 3, '2026-01-05 00:32:00', 14),
(825, 3, '2026-01-05 00:40:00', 9),
(834, 3, '2026-01-05 00:49:00', 16),
(850, 3, '2026-01-05 00:51:00', 3),
(853, 3, '2026-01-05 00:52:00', 7),
(860, 3, '2026-01-05 00:55:00', 1),
(861, 3, '2026-01-05 01:02:00', 8),
(869, 3, '2026-01-05 01:10:00', 7),
(876, 3, '2026-01-05 01:18:00', 7),
(883, 3, '2026-01-05 01:19:00', 7),
(890, 3, '2026-01-05 01:20:00', 8),
(898, 3, '2026-01-05 01:22:00', 2),
(900, 3, '2026-01-05 01:34:00', 17),
(917, 3, '2026-01-05 01:35:00', 14),
(931, 3, '2026-01-05 01:36:00', 4),
(935, 2, '2026-01-05 01:48:00', 14),
(949, 2, '2026-01-05 01:50:00', 8),
(957, 2, '2026-01-05 01:53:00', 2),
(959, 2, '2026-01-05 01:56:00', 5),
(964, 2, '2026-01-05 01:57:00', 1),
(965, 3, '2026-01-05 01:58:00', 2),
(967, 2, '2026-01-05 02:03:00', 3),
(969, 3, '2026-01-05 02:03:00', 2),
(972, 2, '2026-01-05 02:04:00', 2),
(974, 3, '2026-01-05 02:07:00', 1),
(975, 2, '2026-01-05 02:07:00', 1),
(976, 2, '2026-01-05 02:08:00', 1),
(977, 3, '2026-01-05 02:08:00', 2),
(979, 3, '2026-01-05 02:09:00', 2),
(981, 3, '2026-01-05 02:13:00', 1),
(982, 2, '2026-01-05 02:14:00', 1),
(983, 2, '2026-01-05 02:15:00', 1),
(984, 3, '2026-01-05 02:18:00', 3),
(987, 3, '2026-01-05 02:23:00', 3),
(990, 2, '2026-01-05 03:32:00', 1);

-- --------------------------------------------------------

--
-- Table structure for table `scheduled_messages`
--

CREATE TABLE `scheduled_messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `account_id` int(10) UNSIGNED NOT NULL,
  `recipient` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_type` enum('image','document','video','audio') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scheduled_at` timestamp NOT NULL,
  `status` enum('pending','sent','failed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `sent_at` timestamp NULL DEFAULT NULL,
  `message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `webhook_configs`
--

CREATE TABLE `webhook_configs` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `url` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `events` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_triggered_at` timestamp NULL DEFAULT NULL,
  `failure_count` int(10) UNSIGNED DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `whatsapp_accounts`
--

CREATE TABLE `whatsapp_accounts` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'baileys',
  `account_identifier` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `external_device_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('connecting','connected','disconnected','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'connecting',
  `provider_config` json DEFAULT NULL,
  `device_api_key_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_api_key_prefix` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_api_key_encrypted` text COLLATE utf8mb4_unicode_ci COMMENT 'Encrypted device API key for retrieval',
  `device_api_key_last_used_at` timestamp NULL DEFAULT NULL,
  `qr_code` text COLLATE utf8mb4_unicode_ci,
  `qr_expires_at` timestamp NULL DEFAULT NULL,
  `last_connected_at` timestamp NULL DEFAULT NULL,
  `baileys_disclaimer_accepted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `whatsapp_accounts`
--

INSERT INTO `whatsapp_accounts` (`id`, `workspace_id`, `provider`, `account_identifier`, `external_device_id`, `phone_number`, `display_name`, `status`, `provider_config`, `device_api_key_hash`, `device_api_key_prefix`, `device_api_key_encrypted`, `device_api_key_last_used_at`, `qr_code`, `qr_expires_at`, `last_connected_at`, `baileys_disclaimer_accepted`, `created_at`, `updated_at`) VALUES
(41, 3, 'baileys', 'workspace_3-account_41', '45', '085786611365', 'fahmi99ss', 'connected', NULL, '4cf4e7e8f98f6c7fcac98ed3d15ab8b542174954d6f38c6f5b83643e24674147', 'e7709fca4cc01150dd96', 'c9a3960fceae27f917653ee3bfebbd78:73782de19da931a3f59549f4dc9ecc47:340a5587788117b1febf0884b81d8b3a5d3f0102248b1f4a92015122c1746a24afb17ab03f28b152a0dfeca633de652886326a78b78d2224c2e89597fb3ef51e', NULL, '2@lf84SdHjcubqFOfDMCIDR2uSOuUlnlEQZK8OYbmp4U7YgTQzRFrm6MgWEMBlXjO0Fg7xY23urTTWjDuNNQl0DQcNoxblverHF2g=,soGNO2nGlyiLGUpCRyRdNSrkxyRyzleQZRh5IQ2zeWI=,LC+ChTCujUw7lm7jauKU1S/7TgJ0A2xd6Auk9aMQuGc=,IA4YGoEeaLIp40Z3IQVM2raeD0UduqoW4J9n74Ew+iA=', '2026-01-05 01:35:28', '2026-01-05 02:23:01', 1, '2026-01-05 01:34:25', '2026-01-05 02:23:00'),
(42, 2, 'baileys', 'workspace_2-account_42', '46', '085786611365', 'fahmi77', 'connected', NULL, '0c7834900438b422e2a451b90f2fb5ff4a1bf143fd0596d551e18e87c17f915b', 'c3c5e44b852063dd6434', '01a6d5fde5b393fb94c5f5e36ae52616:9795b1030bf2ed175d0f48015e6a0821:99edd994f8d428144b593258c88400d7f2b08dbb3a5c95d335d94588b604f2e16d14164f1846906445b96d6f49f554ed9993a067aab17fdcdfd7f5cc53bca534', NULL, '2@pSHzkCxmep3r//YEDLb4Rcj2ROBwvKK56m3cOkjBRRWgk3iHrma5a/AJ5dVydUv6PHcrdC+cGfbkOmY7SMSiltdsIqo8hO9a7lA=,k0HrL9GE6NM4UuoSI01pSkmClbiy5MbDFI3YYX6SoXQ=,n1t3xGDac0r3+Y84zetqHGbSb3g/RUm9iUOfrfmLylk=,K8gA6p6WWvpRVKFTbtsqORAC5rV3x/k34zcm0doRcrI=', '2026-01-05 01:49:21', '2026-01-05 01:53:31', 1, '2026-01-05 01:48:19', '2026-01-05 01:53:31');

-- --------------------------------------------------------

--
-- Table structure for table `workspaces`
--

CREATE TABLE `workspaces` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscription_tier` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'free',
  `device_limit` int(10) UNSIGNED DEFAULT '1',
  `rate_limit_per_minute` int(10) UNSIGNED DEFAULT '30',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `workspaces`
--

INSERT INTO `workspaces` (`id`, `name`, `subscription_tier`, `device_limit`, `rate_limit_per_minute`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Demo Workspace', 'professional', 10, 120, 1, '2026-01-03 17:10:40', '2026-01-03 17:10:40'),
(2, 'Development Workspace', 'per_device', 1, 30, 1, '2026-01-03 17:11:04', '2026-01-04 21:13:38'),
(3, 'Regular User\'s Workspace', 'per_device', 7, 210, 1, '2026-01-03 18:42:51', '2026-01-04 21:19:35');

-- --------------------------------------------------------

--
-- Table structure for table `workspace_users`
--

CREATE TABLE `workspace_users` (
  `id` int(10) UNSIGNED NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL,
  `oauth_user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'owner',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `workspace_users`
--

INSERT INTO `workspace_users` (`id`, `workspace_id`, `oauth_user_id`, `email`, `full_name`, `role`, `created_at`, `updated_at`) VALUES
(1, 1, 'oauth_user_123', 'demo@example.com', 'Demo User', 'owner', '2026-01-03 17:10:40', '2026-01-03 17:10:40'),
(2, 2, 'dev_user_123', 'dev@example.com', 'Development User', 'owner', '2026-01-03 17:11:04', '2026-01-03 17:11:04'),
(3, 3, '3', 'user@indosofthouse.com', 'Regular User', 'owner', '2026-01-03 18:42:51', '2026-01-03 18:42:51');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_configurations`
--
ALTER TABLE `ai_configurations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_workspace_account` (`workspace_id`,`account_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `idx_workspace` (`workspace_id`),
  ADD KEY `idx_enabled` (`is_enabled`);

--
-- Indexes for table `api_keys`
--
ALTER TABLE `api_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_key_hash` (`key_hash`),
  ADD KEY `idx_workspace` (`workspace_id`),
  ADD KEY `idx_prefix` (`key_prefix`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `auto_reply_rules`
--
ALTER TABLE `auto_reply_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_active` (`workspace_id`,`is_active`),
  ADD KEY `idx_account` (`account_id`),
  ADD KEY `idx_trigger_type` (`trigger_type`),
  ADD KEY `idx_priority` (`priority`);

--
-- Indexes for table `broadcast_messages`
--
ALTER TABLE `broadcast_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `template_id` (`template_id`),
  ADD KEY `target_group_id` (`target_group_id`),
  ADD KEY `idx_workspace_status` (`workspace_id`,`status`),
  ADD KEY `idx_account` (`account_id`),
  ADD KEY `idx_scheduled` (`scheduled_at`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_workspace_phone` (`workspace_id`,`phone_number`),
  ADD KEY `idx_workspace` (`workspace_id`),
  ADD KEY `idx_phone` (`phone_number`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_blocked` (`is_blocked`),
  ADD KEY `idx_last_message` (`last_message_at`);

--
-- Indexes for table `contact_groups`
--
ALTER TABLE `contact_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace` (`workspace_id`);

--
-- Indexes for table `conversation_logs`
--
ALTER TABLE `conversation_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_contact` (`workspace_id`,`contact_phone`,`timestamp`),
  ADD KEY `idx_account_contact` (`account_id`,`contact_phone`,`timestamp`),
  ADD KEY `idx_timestamp` (`timestamp`);

--
-- Indexes for table `message_logs`
--
ALTER TABLE `message_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_sent` (`workspace_id`,`sent_at`),
  ADD KEY `idx_account_sent` (`account_id`,`sent_at`),
  ADD KEY `idx_message_id` (`message_id`),
  ADD KEY `idx_direction_status` (`direction`,`status`),
  ADD KEY `idx_from_number` (`from_number`),
  ADD KEY `idx_to_number` (`to_number`),
  ADD KEY `idx_sent_at` (`sent_at`);

--
-- Indexes for table `message_templates`
--
ALTER TABLE `message_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_category` (`workspace_id`,`category`),
  ADD KEY `idx_favorite` (`is_favorite`),
  ADD KEY `idx_usage` (`usage_count`);

--
-- Indexes for table `rate_limits`
--
ALTER TABLE `rate_limits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_workspace_window` (`workspace_id`,`window_start`),
  ADD KEY `idx_window_start` (`window_start`);

--
-- Indexes for table `scheduled_messages`
--
ALTER TABLE `scheduled_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace_status` (`workspace_id`,`status`),
  ADD KEY `idx_account` (`account_id`),
  ADD KEY `idx_scheduled` (`scheduled_at`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `webhook_configs`
--
ALTER TABLE `webhook_configs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace` (`workspace_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `whatsapp_accounts`
--
ALTER TABLE `whatsapp_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_account_identifier` (`account_identifier`),
  ADD UNIQUE KEY `unique_device_api_key` (`device_api_key_hash`),
  ADD KEY `idx_workspace_status` (`workspace_id`,`status`),
  ADD KEY `idx_provider` (`provider`),
  ADD KEY `idx_phone` (`phone_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_device_api_key_hash` (`device_api_key_hash`),
  ADD KEY `idx_device_api_key_prefix` (`device_api_key_prefix`),
  ADD KEY `idx_external_device_id` (`external_device_id`);

--
-- Indexes for table `workspaces`
--
ALTER TABLE `workspaces`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_tier` (`subscription_tier`);

--
-- Indexes for table `workspace_users`
--
ALTER TABLE `workspace_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_oauth_user` (`oauth_user_id`),
  ADD KEY `idx_workspace` (`workspace_id`),
  ADD KEY `idx_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_configurations`
--
ALTER TABLE `ai_configurations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `api_keys`
--
ALTER TABLE `api_keys`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auto_reply_rules`
--
ALTER TABLE `auto_reply_rules`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `broadcast_messages`
--
ALTER TABLE `broadcast_messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contact_groups`
--
ALTER TABLE `contact_groups`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conversation_logs`
--
ALTER TABLE `conversation_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `message_logs`
--
ALTER TABLE `message_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `message_templates`
--
ALTER TABLE `message_templates`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `rate_limits`
--
ALTER TABLE `rate_limits`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=991;

--
-- AUTO_INCREMENT for table `scheduled_messages`
--
ALTER TABLE `scheduled_messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `webhook_configs`
--
ALTER TABLE `webhook_configs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `whatsapp_accounts`
--
ALTER TABLE `whatsapp_accounts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `workspaces`
--
ALTER TABLE `workspaces`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `workspace_users`
--
ALTER TABLE `workspace_users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ai_configurations`
--
ALTER TABLE `ai_configurations`
  ADD CONSTRAINT `ai_configurations_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ai_configurations_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `whatsapp_accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `api_keys`
--
ALTER TABLE `api_keys`
  ADD CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `auto_reply_rules`
--
ALTER TABLE `auto_reply_rules`
  ADD CONSTRAINT `auto_reply_rules_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `auto_reply_rules_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `whatsapp_accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `broadcast_messages`
--
ALTER TABLE `broadcast_messages`
  ADD CONSTRAINT `broadcast_messages_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `broadcast_messages_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `whatsapp_accounts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `broadcast_messages_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `message_templates` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `broadcast_messages_ibfk_4` FOREIGN KEY (`target_group_id`) REFERENCES `contact_groups` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `contacts`
--
ALTER TABLE `contacts`
  ADD CONSTRAINT `contacts_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `contact_groups`
--
ALTER TABLE `contact_groups`
  ADD CONSTRAINT `contact_groups_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversation_logs`
--
ALTER TABLE `conversation_logs`
  ADD CONSTRAINT `conversation_logs_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversation_logs_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `whatsapp_accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `message_logs`
--
ALTER TABLE `message_logs`
  ADD CONSTRAINT `message_logs_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `message_logs_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `whatsapp_accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `message_templates`
--
ALTER TABLE `message_templates`
  ADD CONSTRAINT `message_templates_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rate_limits`
--
ALTER TABLE `rate_limits`
  ADD CONSTRAINT `rate_limits_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `scheduled_messages`
--
ALTER TABLE `scheduled_messages`
  ADD CONSTRAINT `scheduled_messages_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `scheduled_messages_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `whatsapp_accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `webhook_configs`
--
ALTER TABLE `webhook_configs`
  ADD CONSTRAINT `webhook_configs_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `whatsapp_accounts`
--
ALTER TABLE `whatsapp_accounts`
  ADD CONSTRAINT `whatsapp_accounts_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `workspace_users`
--
ALTER TABLE `workspace_users`
  ADD CONSTRAINT `workspace_users_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
