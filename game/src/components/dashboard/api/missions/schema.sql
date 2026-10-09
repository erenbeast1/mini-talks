-- =====================================================
-- MISSIONS SCHEMA
-- =====================================================

-- Mission presets table (30 preset missions)
CREATE TABLE IF NOT EXISTS mission_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mission_text VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'easy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert 30 preset missions
INSERT INTO mission_presets (mission_text) VALUES
('Choose one scene and record one level'),
('Record a level in your favorite scene'),
('Start a new scene today'),
('Finish the level you played last time'),
('Try a level you have never played'),
('Say the first word in your scene'),
('Record the Sound Level in any scene'),
('Record the Word Level in any scene'),
('Record the Sentence Level in any scene'),
('Record the Dialogue Level in any scene'),
('Say one word a little louder in your scene'),
('Try saying your line before the character speaks'),
('Finish a level without pausing'),
('Record the same level two times'),
('Record a level in a calm scene like Playground or Library'),
('Try a level in a scene you feel comfortable in'),
('Finish one full level using your brave voice'),
('Record a scene level you paused earlier'),
('Record a level you really like again'),
('Complete all four levels in one scene'),
('Try two different scenes in the same day'),
('Record three different levels this week'),
('Collect three bricks by recording three levels'),
('Continue your streak by playing any scene'),
('Return to a scene you have not played recently'),
('Complete the missing level in a scene'),
('Record a level in a brand new scene'),
('Try the first level (Sound) in five different scenes'),
('Finish two levels in one scene today'),
('Say one new word in any scene');

-- Mission settings table (parent's selections for mini)
CREATE TABLE IF NOT EXISTS mission_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mini_id INT NOT NULL,
    parent_id INT NOT NULL,
    selected_mission_ids JSON DEFAULT NULL COMMENT 'Array of selected preset IDs',
    custom_message VARCHAR(60) DEFAULT NULL,
    show_for ENUM('today', 'three_days', 'week', 'rotate') DEFAULT 'today',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_mini_parent (mini_id, parent_id),
    INDEX idx_mini_id (mini_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mission assignments table (which missions are active for mini)
CREATE TABLE IF NOT EXISTS mission_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mini_id INT NOT NULL,
    mission_id INT DEFAULT NULL COMMENT 'References mission_presets.id, NULL for custom',
    custom_text VARCHAR(60) DEFAULT NULL,
    assigned_at DATE NOT NULL,
    expires_at DATE DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    
    INDEX idx_mini_id (mini_id),
    INDEX idx_assigned_at (assigned_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mission completions table (tracks completed missions)
CREATE TABLE IF NOT EXISTS mission_completions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mini_id INT NOT NULL,
    mission_id INT DEFAULT NULL COMMENT 'References mission_presets.id',
    assignment_id INT DEFAULT NULL COMMENT 'References mission_assignments.id',
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_mini_id (mini_id),
    INDEX idx_mission_id (mission_id),
    INDEX idx_completed_at (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
INSERT INTO mission_settings (mini_id, parent_id, selected_mission_ids, custom_message, show_for) VALUES
(4, 1, '[1, 2, 5, 6, 7]', 'You can do it!', 'today');

-- Sample completions
INSERT INTO mission_completions (mini_id, mission_id, completed_at) VALUES
(4, 1, NOW()),
(4, 2, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 5, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 6, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(4, 7, DATE_SUB(NOW(), INTERVAL 7 DAY));
