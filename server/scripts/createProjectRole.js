/**
 * Simple script to create a ProjectRole entry.
 * Usage: node createProjectRole.js <MONGO_URI> <PROJECT_ID> <USER_ID> <ROLE>
 *
 * Note: this file is written as an ES module (import). Your environment should
 * support `type: "module"` in package.json or run it with node in a compatible setup.
 */
import mongoose from 'mongoose';
import ProjectRole from '../src/models/projectRole.js';

const [,, mongoUri, projectId, userId, role] = process.argv;

if (!mongoUri || !projectId || !userId || !role) {
  console.error('Usage: node createProjectRole.js <MONGO_URI> <PROJECT_ID> <USER_ID> <ROLE>');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(mongoUri);
    const pr = new ProjectRole({ projectId, userId, role });
    await pr.save();
    console.log('Created ProjectRole:', pr);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
