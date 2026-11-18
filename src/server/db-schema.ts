import {pgTable,text} from 'drizzle-orm/pg-core';

/** Typed ORM model matching the versioned PostgreSQL corpus migration. */
export const corpusTable=pgTable('guepard_corpus',{
 id:text('id').primaryKey(),
 language:text('language',{enum:['FR','EN']}).notNull(),
 complexity:text('complexity',{enum:['easy','medium','hard']}).notNull(),
 kind:text('kind',{enum:['story','words']}).notNull(),
 content:text('content').notNull(),
 source:text('source').notNull(),
});
