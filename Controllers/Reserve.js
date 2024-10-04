import connection from "./../DataBase.js";
import { sendMail } from "./../emailService.js";

// Get reserved books of a user
export const getReserveBooksOfUser = (req, res) => {
  const { UserID } = req.params;
  const query = `
        SELECT 
        Reserve.Reserve_ID,
        Book_Copy.Copy_ID,
        Book.Title,
        Language.Language_Name AS Language,
        Location.Floor,
        Location.Section,
        Location.Shelf_Number,
        Location.RowNum,
        Reserve.Reserve_Date,
        Reserve.Reserve_Time,
        Reserve.Reserve_End_Time
        FROM 
        Book_Copy
        JOIN Language ON Book_Copy.Language = Language.Language_ID
        JOIN Location ON Book_Copy.Book_Location = Location.Loca_ID
        JOIN Reserve ON Book_Copy.Copy_ID = Reserve.Book_ID
        JOIN Book ON Book_Copy.Book_ID = Book.Book_ID
        WHERE 
        Reserve.User_ID = ?
    `;

  connection.query(query, [UserID], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.status(200).json(results);
  });
};

export const reserveBook = (req, res) => {
  const {
    UserID,
    Copy_ID,
    isComplete,
    Reserve_Date,
    Reserve_Time,
    Reserve_End_Time,
  } = req.body;

  // Check if the user already has 2 or more books reserved
  const checkUserReservationsQuery = `
    SELECT COUNT(*) AS reservationCount 
    FROM Reserve 
    WHERE User_ID = ? AND isComplete = FALSE
  `;

  connection.query(checkUserReservationsQuery, [UserID], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const { reservationCount } = results[0];
    if (reservationCount >= 2) {
      return res.status(400).json({
        error: "User has already reserved the maximum number of books (2)",
      });
    }

    // First, check if the book copy is already reserved or borrowed
    const checkQuery = `
      SELECT isReserved, isBorrowed 
      FROM Book_Copy 
      WHERE Copy_ID = ?
    `;

    connection.query(checkQuery, [Copy_ID], (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Book copy not found" });
      }

      const { isReserved, isBorrowed } = results[0];
      if (isReserved || isBorrowed) {
        return res
          .status(400)
          .json({ error: "Book copy is already reserved or borrowed" });
      }

      // If not reserved or borrowed, proceed to reserve the book copy
      const reserveQuery = `
        INSERT INTO Reserve(User_ID, Book_ID, isComplete, Reserve_Date, Reserve_Time, Reserve_End_Time)
        VALUES(?, ?, ?, ?, ?, ?)
      `;

      connection.query(
        reserveQuery,
        [
          UserID,
          Copy_ID,
          isComplete,
          Reserve_Date,
          Reserve_Time,
          Reserve_End_Time,
        ],
        (err, results) => {
          if (err) {
            console.error("Error executing query:", err);
            return res.status(500).json({ error: "Internal server error" });
          }

          // Update the Book_Copy table to set isReserved = TRUE
          const updateQuery = `
            UPDATE Book_Copy
            SET isReserved = TRUE
            WHERE Copy_ID = ?
          `;

          connection.query(updateQuery, [Copy_ID], (err, updateResults) => {
            if (err) {
              console.error("Error updating book copy status:", err);
              return res.status(500).json({ error: "Internal server error" });
            }

            // Uncomment and use this section if you want to send an email notification
            /*
            const emailQuery = `
              SELECT Email
              FROM User
              WHERE User_ID = ?
            `;
            connection.query(emailQuery, [UserID], async (err, emailResults) => {
              if (err) {
                console.error("Error executing query:", err);
                return res.status(500).json({ error: "Internal server error" });
              }

              if (emailResults.length === 0) {
                return res.status(404).json({ error: "User not found" });
              }

              const { Email } = emailResults[0];
              const userName = Email.split("@")[0];

              const from = '"Infopulse Library" <maddison53@ethereal.email>';
              const to = Email; 
              const subject = "Book Reservation Confirmation";
              const text = `Hello ${userName},\n\nYour reservation for the book copy (ID: ${Copy_ID}) has been confirmed.`;
              const html = `<b>Hello ${userName},</b><br><br>Your reservation for the book copy (ID: ${Copy_ID}) has been confirmed.`;

              try {
                await sendMail({ from, to, subject, text, html });
              } catch (error) {
                console.error("Error sending email:", error);
              }
            });
            */

            // Send the response after reservation is successful
            res.status(201).json({ message: "Book reserved successfully" });
          });
        }
      );
    });
  });
};

export const getReserves = (req, res) => {
  const query = `
    SELECT * FROM Reserve
  `;
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.status(200).json(results);
  });
};

export const deleteReserve = (req, res) => {
  const { id } = req.params;
  console.log(id);
  const query = `
    DELETE FROM Reserve
    WHERE Reserve_ID = ?
  `;
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.status(200).json({ message: "Reservation deleted successfully" });
  });
};
