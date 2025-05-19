/**
 * Database Connection Tests
 * 
 * Tests for database connection, configuration, and basic operations.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Increase timeout for MongoDB operations
jest.setTimeout(30000);

describe('Database Connection', () => {
  let mongoServer;

  // Setup in-memory MongoDB server
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Clean up after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear test database between tests
  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  test('should connect to MongoDB successfully', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  test('should create a simple document in MongoDB', async () => {
    // Create a sample schema
    const testSchema = new mongoose.Schema({
      name: String,
      value: Number
    });
    
    // Create a model from the schema
    const TestModel = mongoose.model('Test', testSchema);
    
    // Create and save a document
    const testDoc = new TestModel({
      name: 'test document',
      value: 42
    });
    
    await testDoc.save();
    
    // Retrieve the document
    const retrievedDoc = await TestModel.findOne({ name: 'test document' });
    
    expect(retrievedDoc).toBeDefined();
    expect(retrievedDoc.name).toBe('test document');
    expect(retrievedDoc.value).toBe(42);
  });

  test('should handle connection errors gracefully', async () => {
    // Temporarily disconnect
    await mongoose.disconnect();
    
    // Attempting to use the disconnected connection should throw an error
    const testSchema = new mongoose.Schema({
      name: String
    });
    
    const DisconnectedModel = mongoose.model('Disconnected', testSchema);
    
    await expect(async () => {
      const doc = new DisconnectedModel({ name: 'test' });
      await doc.save();
    }).rejects.toThrow();
    
    // Reconnect for cleanup
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  test('should handle concurrent operations correctly', async () => {
    // Create a sample schema with a unique index
    const concurrentSchema = new mongoose.Schema({
      name: { type: String, unique: true },
      counter: Number
    });
    
    // Create a model from the schema
    const ConcurrentModel = mongoose.model('Concurrent', concurrentSchema);
    
    // Create an initial document
    const doc = new ConcurrentModel({
      name: 'concurrent-test',
      counter: 0
    });
    
    await doc.save();
    
    // Run 5 concurrent increments
    const incrementPromises = [];
    for (let i = 0; i < 5; i++) {
      incrementPromises.push(
        ConcurrentModel.findOneAndUpdate(
          { name: 'concurrent-test' },
          { $inc: { counter: 1 } },
          { new: true }
        )
      );
    }
    
    // Wait for all operations to complete
    await Promise.all(incrementPromises);
    
    // Check the final value
    const finalDoc = await ConcurrentModel.findOne({ name: 'concurrent-test' });
    expect(finalDoc.counter).toBe(5);
  });
}); 