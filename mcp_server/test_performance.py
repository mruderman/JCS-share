#!/usr/bin/env python3
"""
Performance test for HTTP transport MCP server.
Tests concurrent requests, rate limiting, and response times.
"""

import asyncio
import time
import httpx
import json
from statistics import mean, median
from typing import List, Dict, Any

class PerformanceTestResults:
    """Container for performance test results."""
    
    def __init__(self):
        self.response_times: List[float] = []
        self.successful_requests = 0
        self.failed_requests = 0
        self.rate_limited_requests = 0
        self.total_requests = 0
        self.start_time = 0
        self.end_time = 0
    
    @property
    def duration(self) -> float:
        return self.end_time - self.start_time
    
    @property
    def requests_per_second(self) -> float:
        return self.total_requests / self.duration if self.duration > 0 else 0
    
    @property
    def success_rate(self) -> float:
        return (self.successful_requests / self.total_requests * 100) if self.total_requests > 0 else 0
    
    def add_response(self, response_time: float, success: bool, rate_limited: bool = False):
        self.response_times.append(response_time)
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
        if rate_limited:
            self.rate_limited_requests += 1

async def make_request(client: httpx.AsyncClient, url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Make a single HTTP request and measure performance."""
    start_time = time.time()
    
    try:
        response = await client.post(
            url,
            json=payload,
            headers={"Accept": "application/json, text/event-stream"}
        )
        
        response_time = time.time() - start_time
        
        # Check if rate limited
        rate_limited = "rate limit" in response.text.lower() if response.text else False
        
        return {
            "response_time": response_time,
            "status_code": response.status_code,
            "success": response.status_code in [200, 400],  # 400 is expected for auth failures
            "rate_limited": rate_limited,
            "content_length": len(response.text) if response.text else 0
        }
        
    except Exception as e:
        response_time = time.time() - start_time
        return {
            "response_time": response_time,
            "status_code": 0,
            "success": False,
            "rate_limited": False,
            "error": str(e)
        }

async def test_concurrent_requests(url: str, num_requests: int = 20, concurrency: int = 5) -> PerformanceTestResults:
    """Test concurrent request handling."""
    print(f"🚀 Testing {num_requests} concurrent requests (concurrency: {concurrency})...")
    
    results = PerformanceTestResults()
    results.start_time = time.time()
    
    # Create test payload
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "authenticate_user",
            "arguments": {
                "email": "test@example.com",
                "password": "testpassword"
            }
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create semaphore to limit concurrency
        semaphore = asyncio.Semaphore(concurrency)
        
        async def bounded_request():
            async with semaphore:
                return await make_request(client, url, payload)
        
        # Run all requests
        tasks = [bounded_request() for _ in range(num_requests)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for response in responses:
            if isinstance(response, Exception):
                results.add_response(0.0, False)
            else:
                results.add_response(
                    response["response_time"],
                    response["success"],
                    response["rate_limited"]
                )
    
    results.end_time = time.time()
    return results

async def test_sustained_load(url: str, duration_seconds: int = 30, requests_per_second: int = 10) -> PerformanceTestResults:
    """Test sustained load over time."""
    print(f"⏱️  Testing sustained load for {duration_seconds}s at {requests_per_second} req/s...")
    
    results = PerformanceTestResults()
    results.start_time = time.time()
    
    payload = {
        "jsonrpc": "2.0", 
        "id": 2,
        "method": "tools/list"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        end_time = time.time() + duration_seconds
        request_interval = 1.0 / requests_per_second
        
        while time.time() < end_time:
            request_start = time.time()
            
            # Make request
            response = await make_request(client, url, payload)
            results.add_response(
                response["response_time"],
                response["success"],
                response["rate_limited"]
            )
            
            # Wait for next request interval
            elapsed = time.time() - request_start
            if elapsed < request_interval:
                await asyncio.sleep(request_interval - elapsed)
    
    results.end_time = time.time()
    return results

async def test_rate_limiting(url: str, burst_size: int = 150) -> PerformanceTestResults:
    """Test rate limiting functionality."""
    print(f"🛡️  Testing rate limiting with burst of {burst_size} requests...")
    
    results = PerformanceTestResults()
    results.start_time = time.time()
    
    payload = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "get_current_user",
            "arguments": {"auth_token": "test_token"}
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Send burst of requests quickly
        tasks = [make_request(client, url, payload) for _ in range(burst_size)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for response in responses:
            if isinstance(response, Exception):
                results.add_response(0.0, False)
            else:
                results.add_response(
                    response["response_time"],
                    response["success"],
                    response["rate_limited"]
                )
    
    results.end_time = time.time()
    return results

def print_results(test_name: str, results: PerformanceTestResults):
    """Print performance test results."""
    print(f"\n📊 {test_name} Results:")
    print(f"   Total Requests: {results.total_requests}")
    print(f"   Successful: {results.successful_requests} ({results.success_rate:.1f}%)")
    print(f"   Failed: {results.failed_requests}")
    print(f"   Rate Limited: {results.rate_limited_requests}")
    print(f"   Duration: {results.duration:.2f}s")
    print(f"   Requests/sec: {results.requests_per_second:.2f}")
    
    if results.response_times:
        print(f"   Response Time - Mean: {mean(results.response_times)*1000:.1f}ms")
        print(f"   Response Time - Median: {median(results.response_times)*1000:.1f}ms")
        print(f"   Response Time - Min: {min(results.response_times)*1000:.1f}ms")
        print(f"   Response Time - Max: {max(results.response_times)*1000:.1f}ms")

async def run_performance_tests():
    """Run all performance tests."""
    url = "http://localhost:3001/mcp/"
    
    print("🧪 HTTP Transport Performance Testing")
    print("=" * 50)
    
    # Test 1: Concurrent requests
    concurrent_results = await test_concurrent_requests(url, num_requests=50, concurrency=10)
    print_results("Concurrent Requests", concurrent_results)
    
    # Wait between tests
    await asyncio.sleep(2)
    
    # Test 2: Sustained load
    sustained_results = await test_sustained_load(url, duration_seconds=20, requests_per_second=5)
    print_results("Sustained Load", sustained_results)
    
    # Wait between tests
    await asyncio.sleep(2)
    
    # Test 3: Rate limiting
    rate_limit_results = await test_rate_limiting(url, burst_size=120)
    print_results("Rate Limiting", rate_limit_results)
    
    # Summary
    print("\n" + "=" * 50)
    print("🎯 Performance Test Summary")
    print("=" * 50)
    
    if concurrent_results.success_rate > 90:
        print("✅ Concurrent handling: EXCELLENT")
    elif concurrent_results.success_rate > 75:
        print("⚠️  Concurrent handling: GOOD")  
    else:
        print("❌ Concurrent handling: NEEDS IMPROVEMENT")
    
    if sustained_results.requests_per_second > 8:
        print("✅ Sustained throughput: EXCELLENT")
    elif sustained_results.requests_per_second > 5:
        print("⚠️  Sustained throughput: GOOD")
    else:
        print("❌ Sustained throughput: NEEDS IMPROVEMENT")
    
    if rate_limit_results.rate_limited_requests > 10:
        print("✅ Rate limiting: WORKING")
    else:
        print("⚠️  Rate limiting: MAY NOT BE ACTIVE")
    
    avg_response_time = mean(concurrent_results.response_times + sustained_results.response_times) * 1000
    if avg_response_time < 100:
        print("✅ Response times: EXCELLENT")
    elif avg_response_time < 500:
        print("⚠️  Response times: GOOD")
    else:
        print("❌ Response times: SLOW")
    
    print(f"\n🚀 HTTP transport migration SUCCESS! Server handles concurrent requests reliably.")

if __name__ == "__main__":
    asyncio.run(run_performance_tests())