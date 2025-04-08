// server/models/accessCode.js

module.exports = (sequelize, DataTypes) => {
    const AccessCode = sequelize.define('AccessCode', {
      // Primary key; auto-incrementing integer
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // The unique access code provided to a customer
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      // Timestamp for code creation
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
      },
      // Optional expiration timestamp (if you want codes to expire)
      expiresAt: {
        type: DataTypes.DATE,
        field: 'expires_at'
      },
      // Status of the code: active, used, expired, etc.
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active'
      },
      // Optionally, you may store additional metadata as JSON
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true
      }
    }, {
      tableName: 'access_codes',
      timestamps: false, // We'll use createdAt manually here or set timestamps: true to let Sequelize manage createdAt & updatedAt
    });
  
    return AccessCode;
  };