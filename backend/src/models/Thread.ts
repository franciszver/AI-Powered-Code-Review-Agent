import { query, transaction } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export interface Comment {
  id: string;
  threadId: string;
  author: 'user' | 'ai';
  text: string;
  diff?: string | null;
  createdAt: Date;
}

export interface Thread {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  selectedCode: string;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  comments: Comment[];
}

export interface CreateThreadInput {
  file: string;
  startLine: number;
  endLine: number;
  selectedCode: string;
  initialComment?: string;
}

export interface UpdateThreadInput {
  resolved?: boolean;
}

export interface CreateCommentInput {
  threadId: string;
  author: 'user' | 'ai';
  text: string;
  diff?: string;
}

// Database row types
interface ThreadRow {
  id: string;
  file: string;
  start_line: number;
  end_line: number;
  selected_code: string;
  resolved: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CommentRow {
  id: string;
  thread_id: string;
  author: 'user' | 'ai';
  text: string;
  diff: string | null;
  created_at: Date;
}

/**
 * Convert database row to Thread object
 */
function rowToThread(row: ThreadRow, comments: Comment[] = []): Thread {
  return {
    id: row.id,
    file: row.file,
    startLine: row.start_line,
    endLine: row.end_line,
    selectedCode: row.selected_code,
    resolved: row.resolved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comments,
  };
}

/**
 * Convert database row to Comment object
 */
function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    threadId: row.thread_id,
    author: row.author,
    text: row.text,
    diff: row.diff,
    createdAt: row.created_at,
  };
}

/**
 * Create a new thread
 */
export async function createThread(input: CreateThreadInput): Promise<Thread> {
  const id = uuidv4();
  
  return transaction(async (client) => {
    // Insert thread
    const threadResult = await client.query<ThreadRow>(
      `INSERT INTO threads (id, file, start_line, end_line, selected_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, input.file, input.startLine, input.endLine, input.selectedCode]
    );

    const thread = rowToThread(threadResult.rows[0]);
    const comments: Comment[] = [];

    // Add initial comment if provided
    if (input.initialComment) {
      const commentId = uuidv4();
      const commentResult = await client.query<CommentRow>(
        `INSERT INTO comments (id, thread_id, author, text)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [commentId, id, 'user', input.initialComment]
      );
      comments.push(rowToComment(commentResult.rows[0]));
    }

    return { ...thread, comments };
  });
}

/**
 * Get a thread by ID with all comments
 */
export async function getThreadById(id: string): Promise<Thread | null> {
  const threadResult = await query<ThreadRow>(
    'SELECT * FROM threads WHERE id = $1',
    [id]
  );

  if (threadResult.rows.length === 0) {
    return null;
  }

  const commentsResult = await query<CommentRow>(
    'SELECT * FROM comments WHERE thread_id = $1 ORDER BY created_at ASC',
    [id]
  );

  const comments = commentsResult.rows.map(rowToComment);
  return rowToThread(threadResult.rows[0], comments);
}

/**
 * Get all threads with optional filtering
 */
export async function getThreads(options?: {
  file?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Thread[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options?.file) {
    conditions.push(`file = $${paramIndex++}`);
    params.push(options.file);
  }

  if (options?.resolved !== undefined) {
    conditions.push(`resolved = $${paramIndex++}`);
    params.push(options.resolved);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = options?.limit ? `LIMIT $${paramIndex++}` : '';
  const offsetClause = options?.offset ? `OFFSET $${paramIndex}` : '';

  if (options?.limit) params.push(options.limit);
  if (options?.offset) params.push(options.offset);

  const threadResult = await query<ThreadRow>(
    `SELECT * FROM threads ${whereClause} ORDER BY created_at DESC ${limitClause} ${offsetClause}`,
    params
  );

  // Fetch comments for all threads
  const threadIds = threadResult.rows.map(row => row.id);
  
  if (threadIds.length === 0) {
    return [];
  }

  const commentsResult = await query<CommentRow>(
    `SELECT * FROM comments WHERE thread_id = ANY($1) ORDER BY created_at ASC`,
    [threadIds]
  );

  // Group comments by thread
  const commentsByThread = new Map<string, Comment[]>();
  commentsResult.rows.forEach(row => {
    const comment = rowToComment(row);
    const existing = commentsByThread.get(comment.threadId) || [];
    existing.push(comment);
    commentsByThread.set(comment.threadId, existing);
  });

  return threadResult.rows.map(row =>
    rowToThread(row, commentsByThread.get(row.id) || [])
  );
}

/**
 * Update a thread
 */
export async function updateThread(
  id: string,
  input: UpdateThreadInput
): Promise<Thread | null> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.resolved !== undefined) {
    updates.push(`resolved = $${paramIndex++}`);
    params.push(input.resolved);
  }

  if (updates.length === 0) {
    return getThreadById(id);
  }

  params.push(id);

  const result = await query<ThreadRow>(
    `UPDATE threads SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Fetch comments
  const commentsResult = await query<CommentRow>(
    'SELECT * FROM comments WHERE thread_id = $1 ORDER BY created_at ASC',
    [id]
  );

  return rowToThread(result.rows[0], commentsResult.rows.map(rowToComment));
}

/**
 * Delete a thread
 */
export async function deleteThread(id: string): Promise<boolean> {
  const result = await query('DELETE FROM threads WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Add a comment to a thread
 */
export async function addComment(input: CreateCommentInput): Promise<Comment> {
  const id = uuidv4();

  const result = await query<CommentRow>(
    `INSERT INTO comments (id, thread_id, author, text, diff)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, input.threadId, input.author, input.text, input.diff || null]
  );

  // Update thread's updated_at
  await query('UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
    input.threadId,
  ]);

  return rowToComment(result.rows[0]);
}

/**
 * Get comments for a thread
 */
export async function getComments(threadId: string): Promise<Comment[]> {
  const result = await query<CommentRow>(
    'SELECT * FROM comments WHERE thread_id = $1 ORDER BY created_at ASC',
    [threadId]
  );

  return result.rows.map(rowToComment);
}

