import { createConnection } from 'typeorm';
import { User } from '../entities/User';

const connection = createConnection({
    type: 'mysql', // Set the database type
    host: 'localhost', // Database host
    port: 3306, // Database port
    username: 'your_username', // Database username
    password: 'your_password', // Database password
    database: 'your_database_name', // Database name
    entities: [User],
    synchronize: true,
});

export default connection;