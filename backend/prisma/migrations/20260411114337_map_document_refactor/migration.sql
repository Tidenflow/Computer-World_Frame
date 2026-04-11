-- DropForeignKey
ALTER TABLE `user_progress` DROP FOREIGN KEY `user_progress_node_id_fkey`;

-- DropForeignKey
ALTER TABLE `node_dependencies` DROP FOREIGN KEY `node_dependencies_node_id_fkey`;

-- DropForeignKey
ALTER TABLE `node_dependencies` DROP FOREIGN KEY `node_dependencies_depends_on_node_id_fkey`;

-- DropIndex
DROP INDEX `user_progress_unlocked_at_idx` ON `user_progress`;

-- DropIndex
DROP INDEX `user_progress_user_id_node_id_key` ON `user_progress`;

-- AlterTable
ALTER TABLE `user_progress`
    DROP COLUMN `node_id`,
    DROP COLUMN `unlocked_at`,
    DROP COLUMN `matched_term`,
    ADD COLUMN `map_id` VARCHAR(100) NOT NULL,
    ADD COLUMN `map_version` VARCHAR(100) NOT NULL,
    ADD COLUMN `progress_json` JSON NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD UNIQUE INDEX `user_progress_user_id_map_id_map_version_key`(`user_id`, `map_id`, `map_version`),
    ADD INDEX `user_progress_user_id_map_id_idx`(`user_id`, `map_id`);

-- CreateTable
CREATE TABLE `map_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `map_id` VARCHAR(100) NOT NULL,
    `version` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `document_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_at` DATETIME(3) NULL,

    UNIQUE INDEX `map_documents_map_id_version_key`(`map_id`, `version`),
    INDEX `map_documents_map_id_status_idx`(`map_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `map_projections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `map_document_id` INTEGER NOT NULL,
    `projection_json` JSON NOT NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `map_projections_map_document_id_key`(`map_document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DropTable
DROP TABLE `node_dependencies`;

-- DropTable
DROP TABLE `nodes`;

-- AddForeignKey
ALTER TABLE `map_projections` ADD CONSTRAINT `map_projections_map_document_id_fkey` FOREIGN KEY (`map_document_id`) REFERENCES `map_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
