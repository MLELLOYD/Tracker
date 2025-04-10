<?php
// record_fulfillment.php
// Example code to handle an incoming POST request with JSON
header('Content-Type: application/json');

// 1) Read JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$orderId = $data['order_id'] ?? '';
$orderDate = $data['order_date'] ?? '';
$processedBy = $data['processed_by'] ?? '';
$picker = $data['picker'] ?? '';
$action = $data['action'] ?? '';
$link = $data['link'] ?? '';

// 2) Connect to your MySQL database
$servername = "localhost";      // or your DB server
$username = "root";    // DB username
$password = "";    // DB password
$dbname = "fulfillment";        // DB name, e.g. 'fulfillment'

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed: " . $conn->connect_error]);
    exit;
}

// 3) Insert into the "orders" table
//    Make sure your table columns match these field names
$sql = "INSERT INTO orders (order_id, order_date, processed_by, picker, action, link) 
        VALUES (?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["error" => $conn->error]);
    exit;
}
$stmt->bind_param("ssssss", $orderId, $orderDate, $processedBy, $picker, $action, $link);

if ($stmt->execute()) {
    echo json_encode(["message" => "Record inserted successfully"]);
} else {
    echo json_encode(["error" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
