import { useContext, useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { CompiledContractsContext } from "../../contexts/CompiledContractsContext";
import { ConnectionContext } from "../../contexts/ConnectionContext";
import { DevnetContext } from "../../contexts/DevnetContext";
import { DevnetAccount } from "../../types/accounts";
import { Contract } from "../../types/contracts";
import {
  Devnet as DevnetType,
  devnets,
  getAccounts,
} from "../../utils/network";
import { Devnet } from "../Devnet";
import "./styles.css";

import { apiUrl } from "../../utils/network";
import { RemixClientContext } from "../../contexts/RemixClientContext";
import { StarknetWindowObject, connect, disconnect } from "get-starknet";

interface PluginProps {}

function Plugin(_: PluginProps) {
  const remixClient = useContext(RemixClientContext);

  // START : Get Cairo version
  const [cairoVersion, setCairoVersion] = useState("");

  useEffect(() => {
    setTimeout(async () => {
      const response = await fetch(`${apiUrl}/cairo_version`, {
        method: "GET",
        redirect: "follow",
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });
      setCairoVersion(await response.text());
    }, 100);
  }, []);
  // END : Get Cairo version

  // START: DEVNET
  // using local devnet initially
  const [devnet, setDevnet] = useState<DevnetType>(devnets[0]);
  const [isDevnetAlive, setIsDevnetAlive] = useState<boolean>(true);

  const [devnetEnv, setDevnetEnv] = useState<boolean>(true);

  const [availableDevnetAccounts, setAvailableDevnetAccounts] = useState<
    DevnetAccount[]
  >([]);
  const [selectedDevnetAccount, setSelectedDevnetAccount] =
    useState<DevnetAccount | null>(null);

  // devnet live status
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!devnetEnv) return;
      try {
        const response = await fetch(`${devnet.url}/is_alive`, {
          method: "GET",
          redirect: "follow",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const status = await response.text();

        if (status !== "Alive!!!" || response.status !== 200) {
          setIsDevnetAlive(false);
        } else {
          setIsDevnetAlive(true);
        }
      } catch (error) {
        setIsDevnetAlive(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [devnetEnv, devnet, remixClient]);

  useEffect(() => {
    setTimeout(async () => {
      if (devnetEnv && !isDevnetAlive) {
        await remixClient.call(
          "notification" as any,
          "toast",
          `Server ${devnet.name} - ${devnet.url} is not healthy or not reachable at the moment`
        );
      }
    }, 1000);
  }, [devnetEnv, isDevnetAlive, remixClient, devnet]);

  useEffect(() => {
    setTimeout(async () => {
      if (!isDevnetAlive) {
        return;
      }
      const accounts = await getAccounts(devnet.url);
      setAvailableDevnetAccounts(accounts);
    }, 1000);
  }, [devnet, isDevnetAlive]);

  useEffect(() => {
    if (availableDevnetAccounts.length > 0) {
      setSelectedDevnetAccount(availableDevnetAccounts[0]);
    }
  }, [availableDevnetAccounts, devnet]);
  // END: DEVNET

  // START: CAIRO CONTRACTS
  // Store a list of compiled contracts
  const [compiledContracts, setCompiledContracts] = useState<Contract[]>([]);

  // Store the current contract for UX purposes
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null
  );
  // END: CAIRO CONTRACTS

  // START: ACCOUNT, NETWORK, PROVIDER
  // Store connected wallet, account and provider
  const [starknetWindowObject, setStarknetWindowObject] =
    useState<StarknetWindowObject | null>(null);
  // END: ACCOUNT, NETWORK, PROVIDER

  return (
    <DevnetContext.Provider
      value={{
        devnet,
        setDevnet,
        availableDevnetAccounts,
        setAvailableDevnetAccounts,
        selectedDevnetAccount,
        setSelectedDevnetAccount,
        devnetEnv,
        setDevnetEnv,
      }}
    >
      <ConnectionContext.Provider
        value={{ starknetWindowObject, setStarknetWindowObject }}
      >
        <CompiledContractsContext.Provider
          value={{
            contracts: compiledContracts,
            setContracts: setCompiledContracts,
            selectedContract: selectedContract,
            setSelectedContract: setSelectedContract,
          }}
        >
          <div className="mb-1">
            <label className="cairo-version-legend">Using {cairoVersion}</label>
          </div>
          <Nav />
          <div
            style={{
              position: "fixed",
              bottom: "0",
              left: "0",
              right: "0",
              opacity: "1",
            }}
          >
            <button
              onClick={async () => {
                const starknet = await connect({ modalMode: "alwaysAsk" });
                console.log("starknet", starknet);
                await disconnect({ clearLastWallet: true });
              }}
            >
              Connect
            </button>

            <Devnet />
          </div>
        </CompiledContractsContext.Provider>
      </ConnectionContext.Provider>
    </DevnetContext.Provider>
  );
}

export default Plugin;
