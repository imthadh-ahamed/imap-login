export default (sequelize, DataTypes) => {
  /**
   * Defines an Email model to store metadata and content about messages fetched from Gmail.
   */
  const Email = sequelize.define(
    "Email",
    {
      messageId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      from: DataTypes.STRING,
      subject: DataTypes.STRING,
      date: DataTypes.DATE,
      body: DataTypes.TEXT("long"),
      bodyHtml: DataTypes.TEXT("long"),
      hasAttachments: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ["userId", "messageId"],
          name: "unique_user_message",
        },
      ],
    }
  );

  return Email;
};