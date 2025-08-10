import os
from convex import ConvexClient

def main():
    # This is the token I received from the successful authentication
    token = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJrOTcyMXlhYnNueW5kNGV3OXd4N3drcnQ4ZDdrYjQ1MXxqaDc1ZDN0cnpqZ2NhajhrYXMzcWo3NWZheDdrZjZnOCIsImlhdCI6MTc1MjEzMjk4MSwiaXNzIjoiaHR0cHM6Ly9hZGVwdC1sZW9wYXJkLTc5Ny5jb252ZXguc2l0ZSIsImF1ZCI6ImNvbnZleCIsImV4cCI6MTc1MjEzNjU4MX0.bOTWVEmCdWmBsacbdepUvQX1wWOg3o8s-NPGk85Z9iuF0OxP7n5P2zm9SfCv6E4JkfXSc_f3Vk4J9fnb7WVZxWaEzKgXEH_Muh0t3WNf6AYSU7AY5s7Ih2NnEjAV9uLGXXeanfcQclzkxb_Gs8VIw9eNlypY7Vhb6VdnjKgdYapEhIINe64ddhlt7sGh99y0JzdULANLmyPUbtJ5R5IdnzGGuauO6yKu6MbLSIVkpEYk_gK-yXrZ2elX51joT6AN4fZn6AkC1AES6Z8it3fkYtwYH6NvHfUotkPCMZjRGJDgIaFoIi7CQLPKVi6DiVMVg0o_jkPlyQi0qa7F1l5IpA"
    
    # This is the address of the Convex deployment
    address = "https://adept-leopard-797.convex.cloud"

    # Create a Convex client
    client = ConvexClient(address)

    # Set the token for the client
    client.set_auth(token)

    # Call the loggedInUser function
    try:
        result = client.query("auth:loggedInUser")
        print("Success:", result)
    except Exception as e:
        print("Error:", str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()