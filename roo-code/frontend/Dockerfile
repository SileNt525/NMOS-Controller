# ---- Stage 1: Build the React application ----
# Use an official Node.js runtime as a parent image for the build stage
# Choose a Long Term Support (LTS) version, e.g., Node 18 or 20
FROM node:20-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
# This step leverages Docker's cache. If these files don't change,
# Docker won't re-run npm install in subsequent builds.
COPY package.json ./
# If you use yarn, copy yarn.lock instead and use yarn commands
# COPY yarn.lock ./
COPY package-lock.json ./

# Install project dependencies
RUN npm install
# If using yarn: RUN yarn install --frozen-lockfile

# Copy the rest of the application code into the container
COPY . .

# Build the application for production
# This command should match the build script in your package.json
RUN npm run build
# If using yarn: RUN yarn build

# ---- Stage 2: Serve the built application using a lightweight server (Nginx) ----
# Use an official Nginx image as a parent image for the serve stage
FROM nginx:1.27-alpine-slim 
# alpine-slim is a good balance of size and features.

# Remove default Nginx public folder content
RUN rm -rf /usr/share/nginx/html/*

# Copy the build output from the 'builder' stage to Nginx's web root directory
COPY --from=builder /app/build /usr/share/nginx/html

# (Optional but Recommended for SPAs)
# Copy a custom Nginx configuration file to handle client-side routing.
# This ensures that direct navigation to routes like /devices or /connections
# still serves index.html, letting React Router handle the routing.
# You'll need to create an nginx.conf file in your roo-code/frontend directory.
COPY nginx.conf /etc/nginx/conf.d/default.conf
# If you don't provide a custom nginx.conf, Nginx will use its default,
# which might not work well for SPA routing (direct access to sub-routes might 404).

# Expose port 80 (Nginx default port)
EXPOSE 80

# The default Nginx CMD will start Nginx.
# CMD ["nginx", "-g", "daemon off;"] (This is usually the default in the nginx image)

# Print a message indicating the build stage
RUN echo "Frontend Docker image build complete. Static files copied to Nginx."

