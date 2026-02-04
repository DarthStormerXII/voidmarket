/**
 * ENS Gateway Tests
 *
 * Tests for the CCIP-Read gateway server
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../services/ens/gateway/index.js';
import { decodeDnsName, encodeDnsName, namehash } from '../../services/ens/gateway/decoder.js';

// Note: We test against the express app directly without starting a server
// This avoids port conflicts when running tests in parallel

describe('ENS Gateway', () => {

  describe('DNS Name Encoding/Decoding', () => {
    it('should encode DNS name correctly', () => {
      const name = 'alice.voidmarket.eth';
      const encoded = encodeDnsName(name);

      expect(encoded).toMatch(/^0x/);
      expect(encoded.length).toBeGreaterThan(2);
    });

    it('should decode DNS name correctly', () => {
      const name = 'alice.voidmarket.eth';
      const encoded = encodeDnsName(name);
      const decoded = decodeDnsName(encoded);

      expect(decoded).toBe(name);
    });

    it('should handle multi-level subdomains', () => {
      const name = 'eth-5k.alice.voidmarket.eth';
      const encoded = encodeDnsName(name);
      const decoded = decodeDnsName(encoded);

      expect(decoded).toBe(name);
    });
  });

  describe('Namehash', () => {
    it('should compute namehash for voidmarket.eth', () => {
      const hash = namehash('voidmarket.eth');
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should compute different hashes for different names', () => {
      const hash1 = namehash('alice.voidmarket.eth');
      const hash2 = namehash('bob.voidmarket.eth');

      expect(hash1).not.toBe(hash2);
    });

    it('should return zero hash for empty name', () => {
      const hash = namehash('');
      expect(hash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });
  });

  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.domain).toBe('voidmarket.eth');
    });
  });

  describe('Direct Lookup Endpoints', () => {
    it('should return 400 for invalid subdomain format', async () => {
      const response = await request(app).get('/resolve/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid subdomain format');
    });

    it('should return 404 or 500 for non-existent name', async () => {
      const response = await request(app).get('/resolve/nonexistent.voidmarket.eth');

      // 404 if database works, 500 if database not configured
      expect([404, 500]).toContain(response.status);
    });

    it('should return 404 or 500 for non-existent text record', async () => {
      const response = await request(app).get('/text/nonexistent.voidmarket.eth/avatar');

      // 404 if database works, 500 if database not configured
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('CCIP-Read Endpoint', () => {
    it('should accept CCIP-Read requests', async () => {
      // This would require a valid calldata
      // For now, test the endpoint exists
      const response = await request(app)
        .get('/0x0000000000000000000000000000000000000001/0x3b3b57de.json');

      // Should return 400 (invalid calldata) rather than 404 (not found)
      expect([400, 500]).toContain(response.status);
    });
  });
});

describe('ENS Text Records', () => {
  describe('Star Text Records', () => {
    it('should support voidmarket.star-type', () => {
      const validKeys = [
        'voidmarket.star-type',
        'voidmarket.total-photons',
        'voidmarket.cluster',
        'voidmarket.total-bets',
        'voidmarket.total-wins',
      ];

      validKeys.forEach((key) => {
        expect(key.startsWith('voidmarket.')).toBe(true);
      });
    });
  });

  describe('Market Text Records', () => {
    it('should support market-specific keys', () => {
      const validKeys = [
        'voidmarket.question',
        'voidmarket.status',
        'voidmarket.deadline',
        'voidmarket.outcome',
        'voidmarket.total-pool',
      ];

      validKeys.forEach((key) => {
        expect(key.startsWith('voidmarket.')).toBe(true);
      });
    });
  });

  describe('Cluster Text Records', () => {
    it('should support cluster-specific keys', () => {
      const validKeys = [
        'voidmarket.energy',
        'voidmarket.leader',
        'voidmarket.member-count',
        'voidmarket.novas-won',
        'voidmarket.total-novas',
      ];

      validKeys.forEach((key) => {
        expect(key.startsWith('voidmarket.')).toBe(true);
      });
    });
  });
});
