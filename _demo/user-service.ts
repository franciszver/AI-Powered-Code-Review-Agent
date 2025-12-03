// User service with security and performance issues
interface User {
  id: string;
  email: string;
  password: string;  // Bug: Storing plain text password
  role: string;
}

class UserService {
  private users: User[] = [];

  // Bug: SQL injection vulnerability (simulated)
  async findUserByEmail(email: string): Promise<User | undefined> {
    // This would be vulnerable in a real DB query
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    console.log(query);
    return this.users.find(u => u.email === email);
  }

  // Bug: No password hashing
  async createUser(email: string, password: string): Promise<User> {
    const user: User = {
      id: Math.random().toString(),  // Bug: Not a proper UUID
      email,
      password,  // Bug: Plain text password
      role: 'user'
    };
    this.users.push(user);
    return user;
  }

  // Bug: Exposing sensitive data
  async getAllUsers(): Promise<User[]> {
    return this.users;  // Returns passwords too!
  }

  // Bug: No authorization check
  async deleteUser(userId: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === userId);
    if (index > -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }

  // Bug: Timing attack vulnerability
  async validatePassword(email: string, password: string): Promise<boolean> {
    const user = await this.findUserByEmail(email);
    if (!user) return false;
    return user.password === password;  // Direct comparison is vulnerable
  }
}

export default UserService;

