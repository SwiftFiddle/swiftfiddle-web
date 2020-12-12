require "net/http"
require "uri"
require "json"

uri = URI.parse("https://compute.googleapis.com/compute/v1/projects/swift-playground-fbe87/zones/us-central1-a/instances?key=[YOUR_API_KEY]")
request = Net::HTTP::Post.new(uri)
request.content_type = "application/json"
request["Authorization"] = "Bearer [YOUR_ACCESS_TOKEN]"
request["Accept"] = "application/json"
request.body = JSON.dump()

options = {
  use_ssl: true,
}

response = Net::HTTP.start(uri.hostname, uri.port, options) do |http|
  http.request(request)
end

# response.code
# response.body
