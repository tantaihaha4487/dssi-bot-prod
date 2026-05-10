const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("แสดงคู่มือการใช้งาน Bot ทั้งหมด"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("📚 คู่มือการใช้งาน Bot")
      .setDescription("รวมคำสั่งและวิธีใช้งานทั้งหมด")
      .addFields(
        {
          name: "/ping",
          value: "ทดสอบเชื่อมต่อ bot — จะตอบกลับทันที",
          inline: false,
        },
        {
          name: "/reload config",
          value: "โหลด `config.yaml` ใหม่โดยไม่ต้อง restart bot (สำหรับ admin)",
          inline: false,
        },
        {
          name: "/reload database",
          value: "reindex ฐานข้อมูล vector จากไฟล์ทั้งหมดใน `data/` (สำหรับ admin)",
          inline: false,
        },
        {
          name: "/restart",
          value: "restart Discord connection โดย process ยังทำงานต่อ (สำหรับ admin)",
          inline: false,
        },
        {
          name: "/upload",
          value: "อัปโหลดไฟล์ความรู้ (.txt / .pdf / รูปภาพ) เข้า `data/` แล้ว reindex อัตโนมัติ (สำหรับ admin)",
          inline: false,
        },
        {
          name: "/view",
          value: "ดึงไฟล์ความรู้จาก `data/` มาแชร์ในแชท — ไฟล์ใหญ่เกินจะส่งได้จะส่งเป็น link แทน",
          inline: false,
        },
        {
          name: "mention-ask",
          value: "mention bot ตามด้วยคำถาม เช่น `@Bot DSSI คืออะไร` — ระบบจะค้นฐานความรู้แล้วตอบ",
          inline: false,
        },
      )
      .setFooter({ text: "AI might contain misinformation. | Admin commands require proper permissions" });

    await interaction.reply({ embeds: [embed] });
  },
};