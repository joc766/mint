FROM postgres:15-alpine

# Copy the initialization script
COPY init-db.sql /docker-entrypoint-initdb.d/

# Copy migration scripts to a dedicated directory
COPY migrations/ /migrations/

# Copy the migration runner script
COPY run-migration.sh /usr/local/bin/run-migration
RUN chmod +x /usr/local/bin/run-migration
