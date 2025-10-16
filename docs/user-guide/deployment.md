# 🚀 Deployment Guide

Comprehensive guide for deploying the Lean Auth Module in production environments with security, scalability, and reliability in mind.

## Production Architecture

### Recommended Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │    │    Database     │
│   (Nginx/HAProxy│◄──►│   (NestJS)      │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │      SMTP       │    │     File        │
│   (Sessions)    │    │    (Email)      │    │   (Static)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Infrastructure Requirements

#### Compute Resources
- **Minimum**: 1 CPU core, 2GB RAM per instance
- **Recommended**: 2 CPU cores, 4GB RAM per instance
- **High Traffic**: 4+ CPU cores, 8GB RAM with auto-scaling

#### Storage Requirements
- **Application**: 500MB - 2GB (code, dependencies, logs)
- **Database**: 10GB+ (scales with user base)
- **Redis**: 1GB+ (session storage)

## Container Deployment

### Docker Configuration

#### Dockerfile
```dockerfile
# Multi-stage build for optimal image size
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S authapp -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER authapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "dist/main"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  auth-app:
    build: .
    environment:
      - NODE_ENV=production
      - AUTH_PEPPER=${AUTH_PEPPER}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    depends_on:
      - postgres
      - redis
    networks:
      - auth-network
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - auth-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - auth-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  auth-network:
    driver: bridge
```

### Kubernetes Deployment

#### k8s/deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-app
  labels:
    app: auth-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-app
  template:
    metadata:
      labels:
        app: auth-app
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: auth-app
        image: your-registry/auth-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: AUTH_PEPPER
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: pepper
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Environment Configuration

### Production Environment Variables

```bash
# Core Security (use Kubernetes secrets or external secret management)
AUTH_PEPPER_FILE=/run/secrets/pepper

# Database (use connection pooling)
DATABASE_URL=postgresql://user:pass@postgres-cluster:5432/auth_prod?sslmode=require&pool_timeout=20

# Redis Cluster (for high availability)
REDIS_URL=rediss://redis-cluster:6379?password=redis-password

# Email Service
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
MAIL_FROM="Your App <noreply@yourdomain.com>"
FRONTEND_URL=https://yourdomain.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info

# Performance
NODE_OPTIONS="--max-old-space-size=4096"
```

### Secret Management

#### Using Kubernetes Secrets
```bash
# Create secrets
kubectl create secret generic auth-secrets \
  --from-literal=pepper="$(openssl rand -hex 32)"

kubectl create secret generic db-secrets \
  --from-literal=url="postgresql://user:pass@postgres:5432/auth_prod"

kubectl create secret generic redis-secrets \
  --from-literal=url="rediss://:password@redis-cluster:6379"
```

#### Using External Secret Management (AWS Secrets Manager, etc.)
```typescript
// Load secrets at runtime
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({ region: 'us-east-1' });

async function loadSecrets() {
  const pepper = await secretsManager.getSecretValue({ SecretId: 'auth-pepper' });
  const dbUrl = await secretsManager.getSecretValue({ SecretId: 'auth-db-url' });
  const redisUrl = await secretsManager.getSecretValue({ SecretId: 'auth-redis-url' });

  return {
    pepper: pepper.SecretString,
    dbUrl: dbUrl.SecretString,
    redisUrl: redisUrl.SecretString
  };
}
```

## Database Deployment

### PostgreSQL Production Setup

#### Connection Pooling
```yaml
# pgBouncer for connection pooling
pgbouncer:
  image: pgbouncer/pgbouncer:latest
  environment:
    DATABASES_HOST: postgres
    DATABASES_PORT: 5432
    DATABASES_USER: auth_user
    DATABASES_PASSWORD: ${DB_PASSWORD}
    DATABASES_DB: auth_prod
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 1000
    DEFAULT_POOL_SIZE: 25
```

#### Backup Strategy
```bash
#!/bin/bash
# Daily database backup script
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -h postgres -U auth_user -d auth_prod > "$BACKUP_DIR/auth_backup_$DATE.sql"

# Compress and encrypt
gzip "$BACKUP_DIR/auth_backup_$DATE.sql"
gpg -e -r "admin@yourdomain.com" "$BACKUP_DIR/auth_backup_$DATE.sql.gz"

# Upload to secure storage
aws s3 cp "$BACKUP_DIR/auth_backup_$DATE.sql.gz.gpg" s3://your-backup-bucket/

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.gpg" -mtime +30 -delete
```

### Redis Production Setup

#### Redis Cluster Configuration
```yaml
# redis-cluster.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 3
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server"]
        args: ["--cluster-enabled", "yes", "--cluster-config-file", "nodes.conf", "--cluster-node-timeout", "5000", "--appendonly", "yes", "--requirepass", "$(REDIS_PASSWORD)"]
        ports:
        - containerPort: 6379
        - containerPort: 16379
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: password
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Load Balancing & Scaling

### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Ingress Configuration
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auth-app-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: auth-app-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /auth
        pathType: Prefix
        backend:
          service:
            name: auth-app-service
            port:
              number: 3000
```

## Monitoring & Observability

### Health Checks

#### Application Health Endpoint
```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version
    };
  }

  @Get('ready')
  async readinessCheck() {
    // Check database and Redis connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      // Redis ping would go here
      return { status: 'ready' };
    } catch (error) {
      throw new ServiceUnavailableException('Service not ready');
    }
  }
}
```

#### Kubernetes Health Checks
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 60
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Metrics Collection

#### Prometheus Metrics
```typescript
// metrics.middleware.ts
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });

  private httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code']
  });

  use(req: Request, res: Response, next: Function) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      this.httpRequestsTotal.inc({
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode
      });
      this.httpRequestDuration.observe({
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode
      }, duration);
    });

    next();
  }
}
```

#### Grafana Dashboard
```yaml
# Sample dashboard queries
- Authentication Success Rate: rate(auth_events_total{kind="LOGIN_SUCCESS"}[5m])
- Failed Login Attempts: rate(auth_events_total{kind="LOGIN_FAIL"}[5m])
- Active Sessions: redis_sessions_active
- Rate Limit Violations: rate(http_requests_total{status_code="429"}[5m])
- Email Delivery Rate: rate(email_events_total{kind="VERIFY_SENT"}[5m])
```

### Logging Configuration

#### Structured Logging
```typescript
// logger.service.ts
@Injectable()
export class LoggerService {
  private logger = new Logger('AuthModule');

  logAuthEvent(event: string, userId?: string, metadata?: any) {
    this.logger.log({
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  logError(message: string, error: any, context?: any) {
    this.logger.error(message, {
      error: error.message,
      stack: error.stack,
      context
    });
  }
}
```

#### Log Aggregation
```yaml
# Fluent Bit configuration for log shipping
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info

    [INPUT]
        Name              tail
        Path              /var/log/containers/*auth*.log
        Parser            json
        Tag               auth.*
        Refresh_Interval  5

    [OUTPUT]
        Name  elasticsearch
        Match *
        Host  elasticsearch
        Port  9200
        Index auth-logs
```

## Security Hardening

### Network Security

#### Firewall Rules
```bash
# iptables rules for production server
iptables -A INPUT -p tcp --dport 80 -j ACCEPT    # HTTP (redirect to HTTPS)
iptables -A INPUT -p tcp --dport 443 -j ACCEPT   # HTTPS
iptables -A INPUT -p tcp --dport 5432 -j DROP    # Block direct DB access
iptables -A INPUT -p tcp --dport 6379 -j DROP    # Block direct Redis access
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -P INPUT DROP
```

#### Security Groups (AWS)
```json
{
  "SecurityGroup": {
    "GroupName": "auth-app-sg",
    "Description": "Security group for auth application",
    "VpcId": "vpc-12345",
    "Ingress": [
      {
        "IpProtocol": "tcp",
        "FromPort": 443,
        "ToPort": 443,
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
      },
      {
        "IpProtocol": "tcp",
        "FromPort": 80,
        "ToPort": 80,
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
      }
    ]
  }
}
```

### SSL/TLS Configuration

#### Certificate Management
```bash
# Using cert-manager for automatic certificate management
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

#### Nginx SSL Configuration
```nginx
# /etc/nginx/sites-available/auth-app
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://auth-app-service:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Performance Optimization

### Database Optimization

#### Connection Pooling
```typescript
// Prisma configuration for production
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Production optimizations
  log: ['error'],
  errorFormat: 'pretty'
});
```

#### Query Optimization
```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX CONCURRENTLY idx_audit_logs_at ON audit_logs(at);
CREATE INDEX CONCURRENTLY idx_audit_logs_user_id ON audit_logs(user_id);

-- Partition large tables (if needed)
-- CREATE TABLE audit_logs_y2024 PARTITION OF audit_logs FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Redis Optimization

#### Memory Management
```bash
# redis.conf optimizations
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command SHUTDOWN ""
```

#### Cluster Configuration
```yaml
# Redis Cluster with 3 masters, 3 replicas
redis-cluster:
  - name: redis-0
    replicas: 1
  - name: redis-1
    replicas: 1
  - name: redis-2
    replicas: 1
```

## Backup & Recovery

### Automated Backups

#### Database Backup Script
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create database backup
pg_dump -h postgres -U auth_user -d auth_prod -F c -b -f "$BACKUP_DIR/auth_backup_$DATE.dump"

# Compress
gzip "$BACKUP_DIR/auth_backup_$DATE.dump"

# Encrypt with GPG
gpg -e -r "admin@yourdomain.com" "$BACKUP_DIR/auth_backup_$DATE.dump.gz"

# Upload to S3
aws s3 cp "$BACKUP_DIR/auth_backup_$DATE.dump.gz.gpg" s3://your-backup-bucket/

# Cleanup old backups
find "$BACKUP_DIR" -name "*.gpg" -mtime +30 -delete

# Log success
echo "$(date): Backup completed successfully" >> /var/log/backup.log
```

#### Redis Backup
```bash
# Create Redis backup
redis-cli SAVE

# Copy RDB file
cp /data/dump.rdb /backups/redis_$(date +%Y%m%d_%H%M%S).rdb

# Upload to S3
aws s3 cp /backups/redis_*.rdb s3://your-backup-bucket/redis/
```

### Disaster Recovery

#### Recovery Procedures
```typescript
// recovery.service.ts
@Injectable()
export class RecoveryService {
  async restoreFromBackup(backupFile: string) {
    // 1. Stop application
    // 2. Restore database from backup
    // 3. Restore Redis data if needed
    // 4. Verify data integrity
    // 5. Restart application
  }

  async verifyDataIntegrity() {
    // Check user count matches
    // Verify session consistency
    // Validate audit log integrity
  }
}
```

## Operational Monitoring

### Key Metrics to Monitor

#### Application Metrics
- Response times (P50, P95, P99)
- Error rates by endpoint
- Authentication success/failure rates
- Session creation/destruction rates

#### Infrastructure Metrics
- CPU and memory usage
- Database connection pools
- Redis memory usage
- Network I/O

#### Security Metrics
- Failed login attempts per IP
- Rate limit violations
- Unusual session patterns
- Email delivery failures

### Alerting Rules

#### Critical Alerts
```yaml
# Prometheus alerting rules
groups:
  - name: auth-app
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"

    - alert: AuthenticationFailures
      expr: rate(auth_events_total{kind="LOGIN_FAIL"}[5m]) > 100
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High number of authentication failures"
```

## Troubleshooting

### Common Production Issues

#### High Memory Usage
```bash
# Check Redis memory
redis-cli INFO memory

# Check application memory
kubectl top pods

# Common causes:
# - Redis maxmemory exceeded
# - Memory leaks in application
# - Large audit log accumulation
```

#### Database Connection Issues
```bash
# Check PostgreSQL connections
psql -h postgres -U auth_user -d auth_prod -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'auth_prod';"

# Check connection pool
kubectl logs auth-app-pod | grep "connection"
```

#### Redis Connection Issues
```bash
# Test Redis connectivity
redis-cli -h redis-cluster -p 6379 ping

# Check cluster status
redis-cli -h redis-cluster -p 6379 cluster info

# Monitor Redis logs
kubectl logs redis-pod
```

### Performance Tuning

#### Database Query Optimization
```sql
-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM sessions WHERE user_id = $1 AND expires_at > NOW();

-- Add appropriate indexes
CREATE INDEX CONCURRENTLY idx_sessions_user_expires ON sessions(user_id, expires_at);
```

#### Redis Performance Tuning
```bash
# Monitor Redis performance
redis-cli INFO stats

# Optimize Redis configuration
redis-cli CONFIG SET tcp-keepalive 300
redis-cli CONFIG SET timeout 300
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly
- Review authentication logs for suspicious patterns
- Check and clean up expired sessions
- Verify backup integrity
- Update dependencies (patch versions)

#### Monthly
- Security audit and penetration testing
- Performance review and optimization
- Database maintenance (VACUUM, ANALYZE)
- Certificate renewal checks

#### Quarterly
- Full disaster recovery testing
- Security policy review
- Infrastructure capacity planning
- Dependency audit and updates

## Support & Escalation

### Emergency Contacts
- **On-call Engineer**: oncall@yourdomain.com
- **Security Team**: security@yourdomain.com
- **Infrastructure Team**: infra@yourdomain.com

### Escalation Procedures
1. **Level 1**: Application issues - check logs and restart if needed
2. **Level 2**: Database/Redis issues - check connectivity and restart services
3. **Level 3**: Infrastructure issues - escalate to infrastructure team
4. **Level 4**: Security incidents - follow security incident response plan

## Next Steps

1. ✅ **Plan Deployment Architecture** - Choose appropriate infrastructure
2. 📦 **Set Up Infrastructure** - Deploy databases, Redis, etc.
3. ⚙️ **Configure Application** - Apply production settings
4. 🚀 **Deploy Application** - Deploy with proper monitoring
5. 🛠️ **Monitor & Maintain** - Set up monitoring and alerting
6. 📚 **Document Procedures** - Create runbooks for common tasks

## Resources

- [Kubernetes Production Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [PostgreSQL Production Deployment](https://www.postgresql.org/docs/current/runtime-config.html)
- [Redis Production Checklist](https://redis.io/topics/admin)
- [Docker Production Guide](https://docs.docker.com/config/containers/production/)
