const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Seed data
const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create demo tenant
    const tenantResult = await pool.query(`
      INSERT INTO tenants (name, slug, email, phone, address, city, country, timezone, currency, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      'Demo Hotel Group',
      'demo-hotel-group',
      'demo@hotelgroup.com',
      '+1-555-0123',
      '123 Hotel Street',
      'New York',
      'United States',
      'America/New_York',
      'USD',
      'en'
    ]);
    
    const tenantId = tenantResult.rows[0].id;
    console.log('✅ Created demo tenant');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const userResult = await pool.query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      tenantId,
      'admin@demo.com',
      hashedPassword,
      'Admin',
      'User',
      'admin',
      true
    ]);
    
    const userId = userResult.rows[0].id;
    console.log('✅ Created admin user');
    
    // Create demo property
    const propertyResult = await pool.query(`
      INSERT INTO properties (tenant_id, name, slug, description, property_type, star_rating, address, city, country, phone, email, amenities)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      tenantId,
      'Grand Plaza Hotel',
      'grand-plaza-hotel',
      'A luxurious 5-star hotel in the heart of the city',
      'hotel',
      5,
      '456 Grand Avenue',
      'New York',
      'United States',
      '+1-555-0456',
      'info@grandplaza.com',
      ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'concierge', 'valet']
    ]);
    
    const propertyId = propertyResult.rows[0].id;
    console.log('✅ Created demo property');
    
    // Create demo rooms
    const rooms = [
      {
        name: 'Standard Room',
        slug: 'standard-room',
        description: 'Comfortable standard room with city view',
        room_type: 'Standard',
        max_occupancy: 2,
        max_adults: 2,
        max_children: 1,
        bed_type: 'Queen',
        bed_count: 1,
        size_sqm: 25.0,
        amenities: ['wifi', 'tv', 'minibar', 'air_conditioning'],
        base_price: 150.00
      },
      {
        name: 'Deluxe Room',
        slug: 'deluxe-room',
        description: 'Spacious deluxe room with premium amenities',
        room_type: 'Deluxe',
        max_occupancy: 3,
        max_adults: 2,
        max_children: 2,
        bed_type: 'King',
        bed_count: 1,
        size_sqm: 35.0,
        amenities: ['wifi', 'tv', 'minibar', 'air_conditioning', 'balcony', 'city_view'],
        base_price: 200.00
      },
      {
        name: 'Executive Suite',
        slug: 'executive-suite',
        description: 'Luxurious suite with separate living area',
        room_type: 'Suite',
        max_occupancy: 4,
        max_adults: 2,
        max_children: 2,
        bed_type: 'King',
        bed_count: 1,
        size_sqm: 60.0,
        amenities: ['wifi', 'tv', 'minibar', 'air_conditioning', 'balcony', 'city_view', 'living_room', 'kitchenette'],
        base_price: 350.00
      }
    ];
    
    const roomIds = [];
    for (const room of rooms) {
      const roomResult = await pool.query(`
        INSERT INTO rooms (tenant_id, property_id, name, slug, description, room_type, max_occupancy, max_adults, max_children, bed_type, bed_count, size_sqm, amenities, base_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        tenantId, propertyId, room.name, room.slug, room.description, room.room_type,
        room.max_occupancy, room.max_adults, room.max_children, room.bed_type, room.bed_count,
        room.size_sqm, room.amenities, room.base_price
      ]);
      
      roomIds.push(roomResult.rows[0].id);
    }
    
    console.log('✅ Created demo rooms');
    
    // Create rate plans
    const ratePlans = [
      {
        name: 'Standard Rate',
        description: 'Standard pricing for all guests',
        plan_type: 'standard',
        base_price: 0.00, // Will use room base price
        is_dynamic: false
      },
      {
        name: 'Member Rate',
        description: 'Special pricing for members',
        plan_type: 'member',
        base_price: -20.00, // 20% discount
        is_dynamic: false
      },
      {
        name: 'Corporate Rate',
        description: 'Corporate pricing',
        plan_type: 'corporate',
        base_price: -30.00, // 30% discount
        is_dynamic: false
      },
      {
        name: 'Dynamic Rate',
        description: 'Dynamic pricing based on demand',
        plan_type: 'dynamic',
        base_price: 0.00,
        is_dynamic: true,
        dynamic_rules: {
          base_multiplier: 1.0,
          demand_multipliers: {
            low: 0.8,
            medium: 1.0,
            high: 1.2
          },
          season_multipliers: {
            low_season: 0.9,
            high_season: 1.1
          }
        }
      }
    ];
    
    const ratePlanIds = [];
    for (const ratePlan of ratePlans) {
      const ratePlanResult = await pool.query(`
        INSERT INTO rate_plans (tenant_id, property_id, name, description, plan_type, base_price, is_dynamic, dynamic_rules)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        tenantId, propertyId, ratePlan.name, ratePlan.description, ratePlan.plan_type,
        ratePlan.base_price, ratePlan.is_dynamic, ratePlan.dynamic_rules
      ]);
      
      ratePlanIds.push(ratePlanResult.rows[0].id);
    }
    
    console.log('✅ Created rate plans');
    
    // Create sample inventory for next 30 days
    const today = new Date();
    const inventoryData = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (let j = 0; j < roomIds.length; j++) {
        const roomId = roomIds[j];
        const totalRooms = 10 + (j * 5); // 10, 15, 20 rooms respectively
        
        for (const ratePlanId of ratePlanIds) {
          inventoryData.push([
            tenantId, propertyId, roomId, ratePlanId, dateStr, totalRooms, totalRooms
          ]);
        }
      }
    }
    
    // Insert inventory data in batches
    const batchSize = 100;
    for (let i = 0; i < inventoryData.length; i += batchSize) {
      const batch = inventoryData.slice(i, i + batchSize);
      const values = batch.map((row, index) => {
        const offset = i + index;
        return `($${offset * 7 + 1}, $${offset * 7 + 2}, $${offset * 7 + 3}, $${offset * 7 + 4}, $${offset * 7 + 5}, $${offset * 7 + 6}, $${offset * 7 + 7})`;
      }).join(', ');
      
      const params = batch.flat();
      
      await pool.query(`
        INSERT INTO room_inventory (tenant_id, property_id, room_id, rate_plan_id, date, available_rooms, total_rooms)
        VALUES ${values}
      `, params);
    }
    
    console.log('✅ Created sample inventory');
    
    // Create demo guest
    const guestResult = await pool.query(`
      INSERT INTO guests (tenant_id, email, first_name, last_name, phone, nationality, is_vip)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      tenantId,
      'john.doe@example.com',
      'John',
      'Doe',
      '+1-555-0789',
      'United States',
      false
    ]);
    
    const guestId = guestResult.rows[0].id;
    console.log('✅ Created demo guest');
    
    // Create demo booking
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 7);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 3);
    
    const bookingResult = await pool.query(`
      INSERT INTO bookings (tenant_id, property_id, room_id, rate_plan_id, guest_id, booking_reference, check_in_date, check_out_date, adults, children, rooms, total_nights, base_price, total_amount, status, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `, [
      tenantId, propertyId, roomIds[0], ratePlanIds[0], guestId,
      'BK' + Date.now(),
      checkInDate.toISOString().split('T')[0],
      checkOutDate.toISOString().split('T')[0],
      2, 0, 1, 3, 150.00, 450.00,
      'confirmed', 'paid'
    ]);
    
    console.log('✅ Created demo booking');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Data Summary:');
    console.log(`- Tenant: Demo Hotel Group (${tenantId})`);
    console.log(`- Admin User: admin@demo.com / admin123`);
    console.log(`- Property: Grand Plaza Hotel (${propertyId})`);
    console.log(`- Rooms: ${roomIds.length} room types`);
    console.log(`- Rate Plans: ${ratePlanIds.length} rate plans`);
    console.log(`- Inventory: 30 days of availability`);
    console.log(`- Guest: John Doe`);
    console.log(`- Booking: Sample booking created`);
    
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
