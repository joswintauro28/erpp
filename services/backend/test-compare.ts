import bcrypt from 'bcryptjs';

const hash = '$2a$12$XrbLEJZdI/70FKWUdtK/duxCl0gxB6fuN48tkX9PuW.Jcc.a0lcQu'; // emm@email.com hash
console.log("Matches 'password':", bcrypt.compareSync('password', hash));
console.log("Matches 'Password':", bcrypt.compareSync('Password', hash));
console.log("Matches 'password123':", bcrypt.compareSync('password123', hash));
console.log("Matches 'VexInvitePlaceholderPass123!':", bcrypt.compareSync('VexInvitePlaceholderPass123!', hash));

// Let's generate a hash of 'password' and verify
const myHash = bcrypt.hashSync('password', 12);
console.log("myHash matches 'password':", bcrypt.compareSync('password', myHash));
