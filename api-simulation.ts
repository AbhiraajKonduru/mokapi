/**
 * A real-world simulation of a User Management API.
 * Demonstrates: 
 * - Path-based routing
 * - Method-based logic (GET vs POST)
 * - Custom status codes & headers
 * - Persistent in-memory state (cleared when you edit the file!)
 */

let users = [
  { id: 1, name: 'Alice', role: 'Developer', status: 'online' },
  { id: 2, name: 'Bob', role: 'Designer', status: 'away' },
  { id: 3, name: 'Charlie', role: 'Product Manager', status: 'offline' },
];

export default function handler(req: {
  method: string;
  path: string;
  body: any;
  query: any;
}) {
  const { method, path, body } = req;

  // 1. GET /users - list all users
  if (path === '/users' && method === 'GET') {
    return {
      status: 200,
      body: { count: users.length, users },
      headers: { 'X-Mokapi-Served': 'true' }
    };
  }

  // 2. GET /users/:id - get specific user
  if (path.startsWith('/users/') && method === 'GET') {
    const parts = path.split('/');
    const id = parseInt(parts[parts.length - 1], 10);
    const user = users.find(u => u.id === id);

    if (!user) {
      return { status: 404, body: { error: `User ${id} not found` } };
    }
    return user;
  }

  // 3. POST /users - create a new user
  if (path === '/users' && method === 'POST') {
    if (!body || !body.name) {
      return { status: 400, body: { error: 'Missing "name" in request body' } };
    }

    const newUser = {
      id: users.length + 1,
      name: body.name,
      role: body.role || 'Guest',
      status: 'online'
    };
    users.push(newUser);

    return { status: 201, body: newUser };
  }

  // 4. Fallback for unknown routes
  return {
    status: 404,
    body: {
      error: 'Not Found',
      help: 'Try GET /users or POST /users'
    }
  };
}
