import {
    pgTable, text, timestamp, uuid, pgEnum, boolean
} from "drizzle-orm/pg-core"

//This creates an specific type for userRoleEnum : user or admin are the only accepted values.
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    isVerified: boolean("is_verified").notNull().default(false),
    verificationToken: text("verification_token"),
    verificationTokenExperiesAt: timestamp("reset_token_expires_at"),
    resetToken: text("reset_token"),
    resetTokenExpiresAt: timestamp("reset_token_expires_at"),
    refreshTokenHash: text("refresh_token_hash"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

});

export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);
