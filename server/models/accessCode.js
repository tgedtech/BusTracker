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