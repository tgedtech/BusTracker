// server/models/accessCode.js

module.exports = (sequelize, DataTypes) => {
  const AccessCode = sequelize.define('AccessCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'
    },
    // Store the email once the code is assigned
    userEmail: {
      type: DataTypes.STRING,
      field: 'user_email',
      allowNull: true,
    },
    // NEW FIELD: Store the school name
    schoolName: {
      type: DataTypes.STRING,
      field: 'school_name',
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'access_codes',
    timestamps: false,
  });
  
  return AccessCode;
};