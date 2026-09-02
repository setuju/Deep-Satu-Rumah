import socket
import threading
from datetime import datetime
from queue import Queue

def check_port(host, port, timeout=1):
    """Check if a specific port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except socket.error:
        return False

def worker(host, port_queue, open_ports, timeout=1):
    """Worker thread for concurrent port scanning"""
    while not port_queue.empty():
        try:
            port = port_queue.get_nowait()
            if check_port(host, port, timeout):
                open_ports.append(port)
                print(f"✅ Port {port} is OPEN")
            port_queue.task_done()
        except queue.Empty:
            break

def scan_ports_concurrent(host, ports, num_threads=50, timeout=1):
    """
    Scan multiple ports concurrently
    """
    port_queue = Queue()
    open_ports = []

    for port in ports:
        port_queue.put(port)

    threads = []
    for _ in range(min(num_threads, len(ports))):
        thread = threading.Thread(target=worker, args=(host, port_queue, open_ports, timeout))
        thread.start()
        threads.append(thread)

    for thread in threads:
        thread.join()

    return sorted(open_ports)

if __name__ == "__main__":
    host = "localhost"
    ports_to_scan = range(1, 1025)

    print(f"Concurrently scanning ports 1-1024 on {host}")
    print(f"Started at: {datetime.now()}\n")

    open_ports = scan_ports_concurrent(host, ports_to_scan, num_threads=100)

    print(f"\n{'='*50}")
    print(f"Scan completed at: {datetime.now()}")
    print(f"Found {len(open_ports)} open port(s): {open_ports}")

    common_services = {
        22: "SSH",
        80: "HTTP",
        443: "HTTPS",
        3000: "DeepTerm-API",
        3306: "MySQL",
        5432: "PostgreSQL",
        8080: "HTTP-Alt",
        8501: "Streamlit"
    }

    if open_ports:
        print("\nOpen ports and likely services:")
        for port in open_ports:
            service = common_services.get(port, "Unknown")
            print(f"  {port}: {service}")
