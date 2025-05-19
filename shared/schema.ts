import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Define the schema for post generation
export const postGenerationSchema = z.object({
  productName: z.string().optional(),
  postType: z.enum(["general", "promotion", "event", "seasonal"]),
  image: z.string().optional(),
});

export type PostGenerationRequest = z.infer<typeof postGenerationSchema>;
