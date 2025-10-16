# 🛠️ Troubleshooting Guide

Comprehensive guide for diagnosing and resolving issues with the Lean Auth Module in development and production environments.

## Quick Diagnostic Commands

### Health Checks

#### Application Health
```bash
# Check if application is running
curl -f http://localhost:3000/health || echo "Application not responding"

# Check readiness
curl -f http://localhost:3000/ready || echo "Application not ready"

# Application logs
kubectl logs -l app=auth-app --tail=50
```

#### Database Connectivity
```bash
# PostgreSQL connection test
psql -h localhost -U auth_user -d auth_prod -c "SELECT 1;"

# Check active connections
psql -h localhost -U auth_user -d auth_prod -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'auth_prod';"

# Database performance
psql -h localhost -U auth_user -d auth_prod -c "SELECT schemaname, tablename, attname, n_distinct FROM pg_stats WHERE schemaname = 'public' ORDER BY tablename;"
```

#### Redis Connectivity
```bash
# Basic connectivity test
redis-cli -h localhost -p 6379 ping

# Check Redis info
redis-cli -h localhost -p 6379 info server

# Check cluster status (if using cluster)
redis-cli -h localhost -p 6379 cluster info

# Monitor Redis memory
redis-cli -h localhost -p 6379 info memory
```

## Common Issues & Solutions

### Authentication Issues

#### "Invalid credentials" Error

**Symptoms:**
- Login attempts return 401 Unauthorized
- Users can't authenticate despite correct credentials

**Possible Causes:**
1. **Email not verified** (if verification is required)
2. **Incorrect password**
3. **User account inactive**
4. **Session issues**

**Diagnosis:**
```bash
# Check user verification status
psql -h localhost -U auth_user -d auth_prod -c "SELECT email, emailVerifiedAt FROM users WHERE email = 'user@example.com';"

# Check user active status
psql -h localhost -U auth_user -d auth_prod -c "SELECT email, isActive FROM users WHERE email = 'user@example.com';"

# Check recent login attempts in audit logs
psql -h localhost -U auth_user -d auth_prod -c "SELECT kind, at FROM audit_logs WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com') ORDER BY at DESC LIMIT 10;"
```

**Solutions:**
1. **Verify email verification requirement**: Check `emailVerification.disableEmailVerification` setting
2. **Reset password**: Use password reset flow if user forgot password
3. **Activate user**: Update `isActive` field if account was deactivated
4. **Check session validity**: Ensure session cookies are properly set

#### CSRF Token Issues

**Symptoms:**
- POST/PUT/PATCH/DELETE requests return 403 Forbidden
- "Invalid CSRF token" errors

**Possible Causes:**
1. **Missing CSRF token** in request headers
2. **CSRF token expired** or invalid
3. **Cookie domain mismatch**

**Diagnosis:**
```bash
# Check CSRF cookie configuration
curl -v -H "Cookie: session-id=abc123" http://localhost:3000/auth/me 2>&1 | grep -i csrf

# Verify CSRF token is being sent
curl -v -X POST http://localhost:3000/auth/logout \
  -H "Cookie: session-id=abc123" \
  -H "x-csrf-token: your-csrf-token" 2>&1
```

**Solutions:**
1. **Include CSRF token**: Ensure frontend sends `x-csrf-token` header
2. **Check cookie domain**: Verify `csrfCookieName` configuration matches frontend expectations
3. **Token refresh**: CSRF tokens are set on first GET request when session exists

### Database Issues

#### Connection Failures

**Symptoms:**
- Application fails to start
- "Prisma connection failed" errors
- Database queries timeout

**Diagnosis:**
```bash
# Test database connectivity
psql -h localhost -U auth_user -d auth_prod -c "SELECT version();"

# Check database logs
tail -f /var/log/postgresql/postgresql.log

# Check connection pool status
psql -h localhost -U auth_user -d auth_prod -c "SELECT * FROM pg_stat_activity WHERE usename = 'auth_user';"
```

**Solutions:**
1. **Verify DATABASE_URL**: Check connection string format and credentials
2. **Check network connectivity**: Ensure database is accessible from application
3. **Review connection limits**: PostgreSQL may have connection limits
4. **Check SSL configuration**: Ensure SSL settings match database requirements

#### Slow Queries

**Symptoms:**
- Authentication endpoints are slow
- High response times for database operations

**Diagnosis:**
```sql
-- Enable query logging temporarily
ALTER DATABASE auth_prod SET log_statement = 'all';
ALTER DATABASE auth_prod SET log_min_duration_statement = 1000;

-- Check slow queries
SELECT query, calls, total_time, mean_time FROM pg_stat_statements WHERE total_time > 1000 ORDER BY total_time DESC;

-- Reset logging after diagnosis
ALTER DATABASE auth_prod SET log_statement = 'none';
ALTER DATABASE auth_prod SET log_min_duration_statement = -1;
```

**Solutions:**
1. **Add missing indexes**: Create indexes for frequently queried columns
2. **Optimize query patterns**: Review and optimize database queries
3. **Connection pooling**: Use pgBouncer for better connection management

### Redis Issues

#### Connection Problems

**Symptoms:**
- Session creation fails
- Rate limiting not working
- Redis-related errors in logs

**Diagnosis:**
```bash
# Test Redis connectivity
redis-cli -h localhost -p 6379 ping

# Check Redis status
redis-cli -h localhost -p 6379 info server

# Check memory usage
redis-cli -h localhost -p 6379 info memory

# Monitor Redis logs
tail -f /var/log/redis/redis.log
```

**Solutions:**
1. **Verify REDIS_URL**: Check connection string and authentication
2. **Check Redis configuration**: Ensure proper memory limits and persistence
3. **Network connectivity**: Verify Redis is accessible from application
4. **Resource limits**: Check if Redis is running out of memory

#### Session Issues

**Symptoms:**
- Users can't stay logged in
- Sessions expire prematurely
- Session creation fails

**Diagnosis:**
```bash
# Check active sessions
redis-cli -h localhost -p 6379 keys "sess:*" | wc -l

# Check session TTL
redis-cli -h localhost -p 6379 ttl sess:your-session-id

# Monitor session operations
redis-cli -h localhost -p 6379 monitor | grep -E "(sess:|SET|GET|DEL)"
```

**Solutions:**
1. **Check session TTL configuration**: Verify `SESSION_TTL_DAYS` setting
2. **Redis memory issues**: Ensure Redis has sufficient memory for sessions
3. **Network timeouts**: Check Redis connection timeouts

### Email Issues

#### Email Delivery Failures

**Symptoms:**
- Users don't receive verification emails
- Password reset emails not sent
- Email-related errors in logs

**Diagnosis:**
```bash
# Check SMTP configuration
telnet smtp.gmail.com 587

# Test email sending manually
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }
});
transporter.sendMail({
  from: 'test@example.com',
  to: 'recipient@example.com',
  subject: 'Test Email',
  text: 'This is a test email'
}).then(() => console.log('Email sent')).catch(console.error);
"
```

**Solutions:**
1. **Verify SMTP credentials**: Check username, password, and server settings
2. **Check firewall rules**: Ensure SMTP ports (25, 465, 587) are open
3. **Test with different providers**: Try Gmail, SendGrid, or AWS SES
4. **Check spam filters**: Emails may be filtered as spam

#### Email Template Issues

**Symptoms:**
- Emails sent but content is incorrect
- Links in emails don't work

**Diagnosis:**
```typescript
// Check frontend URL configuration
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Verify email link generation
const token = 'test-token';
const url = `${process.env.FRONTEND_URL}/verify?token=${token}`;
console.log('Verification URL:', url);
```

**Solutions:**
1. **Check FRONTEND_URL**: Ensure correct base URL for email links
2. **Verify token encoding**: Ensure tokens are properly URL-encoded
3. **Test email templates**: Send test emails to verify formatting

### Rate Limiting Issues

#### False Positives

**Symptoms:**
- Legitimate users being rate limited
- High rate limit violation errors

**Diagnosis:**
```bash
# Check current rate limits
redis-cli -h localhost -p 6379 keys "rl:*" | head -10

# Check rate limit counters
redis-cli -h localhost -p 6379 zcard rl:ip:192.168.1.1:login

# Monitor rate limit violations
grep "Too Many Requests" /var/log/app.log | tail -10
```

**Solutions:**
1. **Adjust rate limits**: Increase limits if too restrictive for legitimate traffic
2. **Check IP aggregation**: Verify IP detection logic for proxy setups
3. **Account vs IP limits**: Ensure appropriate balance between security and usability

#### Rate Limit Headers Missing

**Symptoms:**
- Rate limiting not working
- No rate limit headers in responses

**Diagnosis:**
```bash
# Check if rate limiting middleware is applied
curl -v http://localhost:3000/auth/login 2>&1 | grep -i "rate"

# Verify Redis rate limit keys exist
redis-cli -h localhost -p 6379 keys "rl:*" | wc -l
```

**Solutions:**
1. **Check middleware order**: Ensure rate limiting middleware is properly configured
2. **Verify Redis connectivity**: Rate limits are stored in Redis
3. **Check endpoint configuration**: Ensure `@RateLimit` decorators are applied

### Performance Issues

#### High Response Times

**Symptoms:**
- Slow authentication endpoints
- High latency in login/register flows

**Diagnosis:**
```bash
# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/auth/me

# Database query performance
psql -h localhost -U auth_user -d auth_prod -c "EXPLAIN ANALYZE SELECT * FROM sessions WHERE user_id = 'user-id' AND expires_at > NOW();"

# Redis performance
redis-cli -h localhost -p 6379 info stats | grep -E "(total_commands_processed|instantaneous_ops_per_sec)"
```

**Solutions:**
1. **Database indexes**: Add indexes for frequently queried columns
2. **Connection pooling**: Use pgBouncer for database connections
3. **Redis optimization**: Tune Redis memory and persistence settings
4. **Application caching**: Cache frequently accessed data

#### Memory Issues

**Symptoms:**
- Application crashes with out-of-memory errors
- Performance degradation over time

**Diagnosis:**
```bash
# Check Redis memory usage
redis-cli -h localhost -p 6379 info memory

# Check application memory
pm2 monit

# Check for memory leaks
node --inspect node_modules/.bin/clinic doctor -- /path/to/your/app.js
```

**Solutions:**
1. **Redis memory limits**: Set appropriate `maxmemory` and `maxmemory-policy`
2. **Session cleanup**: Implement automatic cleanup of expired sessions
3. **Application optimization**: Profile and optimize memory usage
4. **Resource limits**: Set appropriate memory limits in deployment

### Configuration Issues

#### Environment Variable Problems

**Symptoms:**
- Application fails to start
- Missing configuration errors

**Diagnosis:**
```bash
# Check environment variables
env | grep -E "(AUTH_|DATABASE_|REDIS_|SMTP_)" | sort

# Verify .env file exists and is readable
ls -la .env
cat .env | head -5

# Check for syntax errors in config files
node -e "console.log('Config test:', require('./config'))"
```

**Solutions:**
1. **Verify .env file**: Ensure all required environment variables are set
2. **Check variable names**: Verify exact variable names match configuration
3. **Validate values**: Ensure values are in correct format (URLs, numbers, etc.)
4. **Check file permissions**: Ensure .env file is readable by application

#### Module Configuration Issues

**Symptoms:**
- AuthModule fails to initialize
- Dependency injection errors

**Diagnosis:**
```typescript
// Check module configuration
console.log('Auth config:', {
  pepper: !!process.env.AUTH_PEPPER,
  redisUrl: !!process.env.REDIS_URL,
  dbUrl: !!process.env.DATABASE_URL,
  smtpHost: !!process.env.SMTP_HOST
});

// Verify Prisma client
const prisma = new PrismaClient();
prisma.$connect().then(() => console.log('DB connected')).catch(console.error);
```

**Solutions:**
1. **Check required dependencies**: Ensure Prisma, Redis clients are properly configured
2. **Verify module imports**: Check that AuthModule is properly imported
3. **Database schema**: Ensure database schema matches Prisma models

## Development Issues

### Hot Reload Problems

**Symptoms:**
- Changes not reflected in running application
- Module not reloading properly

**Diagnosis:**
```bash
# Check file watcher
ps aux | grep -i "nest" | grep -v grep

# Check for compilation errors
npm run build 2>&1 | tail -20

# Verify TypeScript compilation
npx tsc --noEmit
```

**Solutions:**
1. **Restart development server**: `npm run start:dev` after making changes
2. **Check file extensions**: Ensure files have correct extensions (.ts, .js)
3. **Clear cache**: Remove node_modules/.cache if issues persist

### Testing Issues

**Symptoms:**
- Tests failing unexpectedly
- Database connection issues in tests

**Diagnosis:**
```typescript
// Check test database
psql -h localhost -U auth_user -d auth_test -c "SELECT count(*) FROM users;"

// Verify test configuration
cat src/test-setup.ts
```

**Solutions:**
1. **Reset test database**: Clean test data between test runs
2. **Check test isolation**: Ensure tests don't interfere with each other
3. **Verify mocks**: Ensure external dependencies are properly mocked

## Production Debugging

### Log Analysis

#### Application Logs
```bash
# Follow application logs
tail -f /var/log/app/auth.log

# Filter by log level
tail -f /var/log/app/auth.log | grep -E "(ERROR|WARN)"

# Search for specific events
grep "LOGIN_FAIL" /var/log/app/auth.log | tail -10
```

#### Database Logs
```bash
# Enable slow query logging temporarily
psql -h localhost -U auth_user -d auth_prod -c "ALTER DATABASE auth_prod SET log_min_duration_statement = 1000;"

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql.log | grep -E "(duration|ERROR)"

# Reset logging after debugging
psql -h localhost -U auth_user -d auth_prod -c "ALTER DATABASE auth_prod SET log_min_duration_statement = -1;"
```

#### Redis Logs
```bash
# Monitor Redis operations
redis-cli -h localhost -p 6379 monitor | head -20

# Check Redis slow logs
redis-cli -h localhost -p 6379 slowlog get 10

# Redis latency monitoring
redis-cli -h localhost -p 6379 --latency
```

### Performance Profiling

#### Application Profiling
```bash
# Using clinic.js for performance analysis
npx clinic doctor -- node dist/main.js

# Memory profiling
npx clinic heapprofiler -- node dist/main.js

# CPU profiling
npx clinic flame -- node dist/main.js
```

#### Database Profiling
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
WHERE total_time > 1000
ORDER BY total_time DESC
LIMIT 10;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

### Network Debugging

#### Connection Tracing
```bash
# Test database connectivity with timing
time psql -h localhost -U auth_user -d auth_prod -c "SELECT 1;"

# Test Redis connectivity
time redis-cli -h localhost -p 6379 ping

# Network packet capture (if needed)
sudo tcpdump -i lo -A -s 0 port 5432 | head -20
```

## Emergency Procedures

### Service Recovery

#### Quick Restart
```bash
# Stop application
pm2 stop auth-app

# Clear any stuck processes
pm2 delete auth-app

# Restart with fresh state
pm2 start ecosystem.config.js
```

#### Database Recovery
```bash
# Emergency database restart
sudo systemctl stop postgresql
sudo systemctl start postgresql

# Check database integrity
psql -h localhost -U auth_user -d auth_prod -c "SELECT count(*) FROM users;"

# Verify recent data
psql -h localhost -U auth_user -d auth_prod -c "SELECT MAX(created_at) FROM users;"
```

### Incident Response

#### Security Incidents
1. **Isolate affected systems**: Take compromised instances offline
2. **Preserve evidence**: Don't delete logs or data
3. **Notify stakeholders**: Follow incident response plan
4. **Investigate root cause**: Analyze logs and system state
5. **Implement fixes**: Deploy security patches
6. **Monitor for recurrence**: Set up enhanced monitoring

#### Performance Incidents
1. **Scale resources**: Increase CPU/memory if needed
2. **Optimize queries**: Identify and fix slow database operations
3. **Check external dependencies**: Verify Redis, database, email services
4. **Implement caching**: Add application-level caching if appropriate

## Tools & Utilities

### Diagnostic Scripts

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

echo "=== Application Health Check ==="
curl -f http://localhost:3000/health && echo "✓ Application OK" || echo "✗ Application Error"

echo "=== Database Health Check ==="
psql -h localhost -U auth_user -d auth_prod -c "SELECT 1;" && echo "✓ Database OK" || echo "✗ Database Error"

echo "=== Redis Health Check ==="
redis-cli -h localhost -p 6379 ping | grep PONG && echo "✓ Redis OK" || echo "✗ Redis Error"

echo "=== Email Health Check ==="
# Add email test here

echo "=== Rate Limiting Check ==="
redis-cli -h localhost -p 6379 keys "rl:*" | wc -l | xargs echo "Rate limit keys:"
```

#### Log Analysis Script
```bash
#!/bin/bash
# log-analysis.sh

LOG_FILE="/var/log/app/auth.log"

echo "=== Recent Authentication Events ==="
tail -20 "$LOG_FILE" | grep -E "(LOGIN_|REGISTER|VERIFY_|RESET_)"

echo "=== Error Summary ==="
grep -c "ERROR" "$LOG_FILE"

echo "=== Failed Login Attempts (Last Hour) ==="
grep -E "LOGIN_FAIL" "$LOG_FILE" | grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')" | wc -l

echo "=== Rate Limit Violations ==="
grep "Too Many Requests" /var/log/app/access.log | tail -5
```

### Monitoring Dashboards

#### Key Metrics Dashboard
```yaml
# Grafana dashboard queries
- Authentication Success Rate: rate(auth_events_total{kind="LOGIN_SUCCESS"}[5m])
- Failed Login Rate: rate(auth_events_total{kind="LOGIN_FAIL"}[5m])
- Active Sessions: redis_connected_clients - redis_blocked_clients
- Response Time: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
- Error Rate: rate(http_requests_total{status_code=~"5.."}[5m])
```

## Getting Help

### Community Support
- **GitHub Issues**: Report bugs and request features
- **Stack Overflow**: Ask questions with `nestjs-auth` tag
- **Discord**: Join NestJS community for real-time help

### Professional Support
- **Consulting**: Professional implementation and security audits
- **Training**: Custom training for your development team
- **Support Contracts**: Priority support for production deployments

### Reporting Issues

When reporting issues, please include:
1. **Version**: Auth module version and NestJS version
2. **Environment**: Development or production, deployment method
3. **Error logs**: Relevant error messages and stack traces
4. **Configuration**: Sanitized configuration (remove sensitive data)
5. **Steps to reproduce**: Exact steps that cause the issue
6. **Expected vs actual behavior**: What should happen vs what happens

## Maintenance Checklist

### Daily Checks
- [ ] Application responding to health checks
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Recent authentication events reviewed
- [ ] Error rates within acceptable limits

### Weekly Checks
- [ ] Database backups verified
- [ ] Security logs reviewed for suspicious activity
- [ ] Performance metrics analyzed
- [ ] Dependencies checked for updates

### Monthly Checks
- [ ] Full security audit completed
- [ ] All documentation up to date
- [ ] Disaster recovery procedures tested
- [ ] Performance optimizations reviewed

## Next Steps

1. ✅ **Diagnose Issues** - Use diagnostic tools and logs
2. 📚 **Check Documentation** - Review relevant guides for solutions
3. 🛠️ **Apply Fixes** - Implement appropriate solutions
4. 🔍 **Verify Resolution** - Confirm issues are resolved
5. 📝 **Document Solutions** - Update troubleshooting guide with new findings

## Emergency Contacts

- **Technical Support**: support@yourdomain.com
- **Security Issues**: security@yourdomain.com
- **Infrastructure**: infra@yourdomain.com

For urgent issues requiring immediate attention, use the emergency contact procedures defined in your organization's incident response plan.
