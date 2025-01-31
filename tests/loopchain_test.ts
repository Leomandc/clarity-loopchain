import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensures nonprofit registration works",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      Tx.contractCall(
        "loopchain",
        "register-nonprofit",
        [types.utf8("Test Nonprofit")],
        wallet_1.address
      )
    ]);
    assertEquals(block.receipts[0].result.expectOk(), true);
    
    let nonprofit = chain.callReadOnlyFn(
      "loopchain",
      "get-nonprofit-info",
      [types.principal(wallet_1.address)],
      wallet_1.address
    );
    nonprofit.result.expectSome().expectTuple()["verified"].expectBool(false);
  }
});

Clarinet.test({
  name: "Only owner can verify nonprofits",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    
    let block = chain.mineBlock([
      Tx.contractCall(
        "loopchain",
        "verify-nonprofit",
        [types.principal(wallet_1.address)],
        wallet_1.address
      )
    ]);
    block.receipts[0].result.expectErr().expectUint(100);

    block = chain.mineBlock([
      Tx.contractCall(
        "loopchain",
        "verify-nonprofit",
        [types.principal(wallet_1.address)],
        deployer.address
      )
    ]);
    block.receipts[0].result.expectOk();
  }
});

Clarinet.test({
  name: "Can make donation to verified nonprofit",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    chain.mineBlock([
      Tx.contractCall(
        "loopchain", 
        "register-nonprofit",
        [types.utf8("Test Nonprofit")],
        wallet_1.address
      ),
      Tx.contractCall(
        "loopchain",
        "verify-nonprofit",
        [types.principal(wallet_1.address)],
        deployer.address
      )
    ]);

    let block = chain.mineBlock([
      Tx.contractCall(
        "loopchain",
        "donate",
        [
          types.principal(wallet_1.address),
          types.uint(1000000)
        ],
        wallet_2.address
      )
    ]);
    
    block.receipts[0].result.expectOk();
    block.receipts[0].events.expectSTXTransferEvent(
      1000000,
      wallet_2.address,
      wallet_1.address
    );
  }
});
